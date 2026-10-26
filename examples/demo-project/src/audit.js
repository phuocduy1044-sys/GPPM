const auditEvents = [];

function logSecurityEvent(event, username) {
  // STYLE_UNUSED_VARIABLE: clientIp is initialized but never used
  const clientIp = '127.0.0.1';

  auditEvents.push({
    timestamp: new Date().toISOString(),
    event,
    username,
  });

  // Dynamic / unresolved call in AST
  if (typeof globalThis.analyticsCollector !== 'undefined') {
    globalThis.analyticsCollector.send(event);
  }
}

function generateAuditSummary(date) {
  const matching = auditEvents.filter(e => e.timestamp.startsWith(date));
  return {
    date,
    totalEvents: matching.length,
    events: matching,
  };
}

module.exports = {
  logSecurityEvent,
  generateAuditSummary,
};
