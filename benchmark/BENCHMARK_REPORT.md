# BÁO CÁO KẾT QUẢ KIỂM CHỨNG BENCHMARK THỰC NGHIỆM (BENCHMARK REPORT)
**Hệ thống kiểm chứng:** VIECODIE Review Engine  
**Phiên bản Git Commit:** `cfd9f6f`  
**Thời điểm thực thi:** 2026-10-27T14:00:46.829Z  
**Môi trường thử nghiệm:** Node.js v24.22.1 on Windows_NT 10.0.26200 (x64)  
**Thời gian thực thi:** 69ms

---

## 1. Tóm tắt Chỉ số Hiệu năng Thực nghiệm

Hệ thống đã thực hiện phân tích tự động trên toàn bộ **20 ca kiểm thử mẫu** trong thư mục `benchmark/cases/` và đối soát với nhãn chuẩn `benchmark/ground-truth.json`:

| Chỉ số đo lường | Công thức tính | Giá trị thực nghiệm | Mục tiêu thiết kế | Đánh giá |
| :--- | :--- | :---: | :---: | :---: |
| **Độ chính xác (Precision)** | $TP / (TP + FP)$ | **100.0%** (10/10) | $\ge 95\%$ | :white_check_mark: **XUẤT SẮC** |
| **Độ bao quát / Nhạy (Recall)** | $TP / (TP + FN)$ | **100.0%** (10/10) | $\ge 95\%$ | :white_check_mark: **XUẤT SẮC** |
| **Điểm cân bằng F1 (F1-Score)** | $2 \cdot (P \cdot R) / (P + R)$ | **1.000** | $\ge 0.95$ | :white_check_mark: **XUẤT SẮC** |
| **Tỷ lệ báo động giả (FPR)** | $FP / (FP + TN)$ | **0.0%** (0/10) | $\le 5\%$ | :white_check_mark: **TUYỆT ĐỐI** |
| **Độ chuẩn xác toàn bộ (Accuracy)** | $(TP + TN) / Total$ | **100.0%** (20/20) | $\ge 95\%$ | :white_check_mark: **HOÀN HẢO** |

---

## 2. Ma trận Nhầm lẫn (Confusion Matrix)

```
                          Thực tế LỖ HỔNG (Positive)    Thực tế SẠCH (Negative)
Phát hiện LỖ HỔNG (True)            TP = 10                       FP = 0
Bỏ qua / Báo sạch (False)           FN = 0                       TN = 10
```

- **True Positives (TP = 10):** 100% các lỗ hổng bảo mật, lỗi logic và code smell thực tế đều được phát hiện trọn vẹn tại đúng vị trí dòng mã.
- **True Negatives (TN = 10):** 100% các hàm an toàn (có parameterized query, guard clause, optional chaining, bounded regex, hàm tính toán sạch) được công nhận an toàn.
- **False Positives (FP = 0):** Hoàn toàn **không có bất kỳ báo động sai** nào trên các hàm tham chiếu sạch.
- **False Negatives (FN = 0):** Hoàn toàn **không có lỗ hổng nào bị bỏ sót**.

---

## 3. Bảng Chi tiết Kết quả Từng Ca Kiểm thử Thực nghiệm (20/20 Cases)

| ID | Tệp kiểm thử | Hàm mục tiêu | Dòng | Loại lỗi mong đợi | Mã lỗi phát hiện | Trạng thái | Chi tiết ghi nhận |
| :---: | :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **BM-01** | `sql_injection.js` | `getUserUnsafe` | 9 | `SEC_SQL_INJECTION` | `SEC_SQL_INJECTION` | **TP (Đạt)** | Đã phát hiện chính xác lỗ hổng (SEC_SQL_INJECTION) tại dòng 9 |
| **BM-02** | `sql_injection.js` | `searchOrdersUnsafe` | 15 | `SEC_SQL_INJECTION` | `SEC_SQL_INJECTION` | **TP (Đạt)** | Đã phát hiện chính xác lỗ hổng (SEC_SQL_INJECTION) tại dòng 15 |
| **BM-03** | `sql_injection.js` | `getUserSafe` | 20 | `*(Sạch)*` | `*(Không có)*` | **TN (Sạch)** | Mã nguồn sạch, hệ thống nhận diện chính xác là an toàn |
| **BM-04** | `sql_injection.js` | `findUserByEmailOrm` | 26 | `*(Sạch)*` | `*(Không có)*` | **TN (Sạch)** | Mã nguồn sạch, hệ thống nhận diện chính xác là an toàn |
| **BM-05** | `null_dereference.js` | `getUserPassword` | 9 | `BUG_POTENTIAL_NULL_DEREFERENCE` | `BUG_POTENTIAL_NULL_DEREFERENCE` | **TP (Đạt)** | Đã phát hiện chính xác lỗ hổng (BUG_POTENTIAL_NULL_DEREFERENCE) tại dòng 9 |
| **BM-06** | `null_dereference.js` | `getFirstCustomerCity` | 15 | `BUG_POTENTIAL_NULL_DEREFERENCE` | `BUG_POTENTIAL_NULL_DEREFERENCE` | **TP (Đạt)** | Đã phát hiện chính xác lỗ hổng (BUG_POTENTIAL_NULL_DEREFERENCE) tại dòng 15 |
| **BM-07** | `null_dereference.js` | `getUserCitySafe` | 20 | `*(Sạch)*` | `*(Không có)*` | **TN (Sạch)** | Mã nguồn sạch, hệ thống nhận diện chính xác là an toàn |
| **BM-08** | `null_dereference.js` | `validateRecordGuard` | 25 | `*(Sạch)*` | `*(Không có)*` | **TN (Sạch)** | Mã nguồn sạch, hệ thống nhận diện chính xác là an toàn |
| **BM-09** | `hardcoded_secrets.js` | `initOpenAIClient` | 8 | `SEC_HARDCODED_SECRET` | `SEC_HARDCODED_SECRET` | **TP (Đạt)** | Đã phát hiện chính xác lỗ hổng (SEC_HARDCODED_SECRET) tại dòng 8 |
| **BM-10** | `hardcoded_secrets.js` | `getAwsCredentials` | 14 | `SEC_HARDCODED_SECRET` | `SEC_HARDCODED_SECRET` | **TP (Đạt)** | Đã phát hiện chính xác lỗ hổng (SEC_HARDCODED_SECRET) tại dòng 14 |
| **BM-11** | `hardcoded_secrets.js` | `getVaultSecret` | 20 | `*(Sạch)*` | `*(Không có)*` | **TN (Sạch)** | Mã nguồn sạch, hệ thống nhận diện chính xác là an toàn |
| **BM-12** | `loose_equality.js` | `checkAdminRole` | 8 | `BUG_LOOSE_EQUALITY` | `BUG_LOOSE_EQUALITY` | **TP (Đạt)** | Đã phát hiện chính xác lỗ hổng (BUG_LOOSE_EQUALITY) tại dòng 8 |
| **BM-13** | `loose_equality.js` | `isSessionActive` | 16 | `BUG_LOOSE_EQUALITY` | `BUG_LOOSE_EQUALITY` | **TP (Đạt)** | Đã phát hiện chính xác lỗ hổng (BUG_LOOSE_EQUALITY) tại dòng 16 |
| **BM-14** | `loose_equality.js` | `verifyUserStatus` | 24 | `*(Sạch)*` | `*(Không có)*` | **TN (Sạch)** | Mã nguồn sạch, hệ thống nhận diện chính xác là an toàn |
| **BM-15** | `redos_prototype.js` | `mergeUserProfile` | 10 | `SEC_PROTOTYPE_POLLUTION` | `SEC_PROTOTYPE_POLLUTION` | **TP (Đạt)** | Đã phát hiện chính xác lỗ hổng (SEC_PROTOTYPE_POLLUTION) tại dòng 10 |
| **BM-16** | `redos_prototype.js` | `matchNestedTags` | 16 | `SEC_REDOS` | `SEC_REDOS` | **TP (Đạt)** | Đã phát hiện chính xác lỗ hổng (SEC_REDOS) tại dòng 16 |
| **BM-17** | `redos_prototype.js` | `validateUsernameBounded` | 23 | `*(Sạch)*` | `*(Không có)*` | **TN (Sạch)** | Mã nguồn sạch, hệ thống nhận diện chính xác là an toàn |
| **BM-18** | `clean_samples.js` | `calculateMovingAverage` | 8 | `*(Sạch)*` | `*(Không có)*` | **TN (Sạch)** | Mã nguồn sạch, hệ thống nhận diện chính xác là an toàn |
| **BM-19** | `clean_samples.js` | `formatCurrencyVND` | 42 | `*(Sạch)*` | `*(Không có)*` | **TN (Sạch)** | Mã nguồn sạch, hệ thống nhận diện chính xác là an toàn |
| **BM-20** | `clean_samples.js` | `sanitizeAndNormalizeEmail` | 54 | `*(Sạch)*` | `*(Không có)*` | **TN (Sạch)** | Mã nguồn sạch, hệ thống nhận diện chính xác là an toàn |

---

## 4. Kết luận & Ý nghĩa Thực tiễn
1. **Khả năng nhận diện ngữ cảnh sâu:** Hệ thống phát hiện chính xác các lỗ hổng SQL Injection thông qua cả phép nối chuỗi trực tiếp lẫn thông qua biến trung gian được khai báo trong hàm.
2. **Loại bỏ hoàn toàn báo động giả:** Nhờ cơ chế kiểm tra điều kiện bảo vệ (guard clause) và nhận diện toán tử Optional Chaining (`?.`), hệ thống đạt **FPR = 0.0%**, khắc phục điểm yếu lớn nhất của các công cụ linter truyền thống.
3. **Sẵn sàng kiểm chứng tự động:** Toàn bộ quá trình kiểm chứng trên có thể được thực thi lại bất kỳ lúc nào chỉ bằng lệnh duy nhất:
   ```bash
   npm run benchmark
   ```
