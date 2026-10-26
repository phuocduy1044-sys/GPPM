const { authenticateUser } = require('./auth.js');
const { logSecurityEvent, generateAuditSummary } = require('./audit.js');

async function handleLogin(username, password) {
  const result = await authenticateUser(username, password);
  if (result.success) {
    logSecurityEvent('LOGIN_SUCCESS', username);
  } else {
    logSecurityEvent('LOGIN_FAILED', username);
  }
  return result;
}

// MAINT_HIGH_COMPLEXITY: long function with multiple branchings and tasks
function runDailyAudit(date, notifyAdmins = false, exportFormat = 'json') {
  const summary = generateAuditSummary(date);
  const issuesFound = [];

  if (summary.totalEvents === 0) {
    issuesFound.push('No events recorded');
  } else {
    for (const evt of summary.events) {
      if (evt.event === 'LOGIN_FAILED') {
        issuesFound.push(`Failed login detected for ${evt.username}`);
      } else if (evt.event === 'UNAUTHORIZED_ACCESS') {
        issuesFound.push(`Unauthorized access attempt for ${evt.username}`);
      } else if (evt.event === 'PRIVILEGE_ESCALATION') {
        issuesFound.push(`Critical privilege escalation: ${evt.username}`);
      }
    }
  }

  let formattedReport = '';
  if (exportFormat === 'json') {
    formattedReport = JSON.stringify({ summary, issuesFound });
  } else if (exportFormat === 'csv') {
    formattedReport = issuesFound.join(';');
  } else {
    formattedReport = issuesFound.join('\n');
  }

  if (notifyAdmins) {
    if (issuesFound.length > 0) {
      logSecurityEvent('AUDIT_ALERT_TRIGGERED', 'system');
    }
  }

  return { summary, issuesFound, formattedReport };
}

module.exports = {
  handleLogin,
  runDailyAudit,
};
