-- AlterTable
ALTER TABLE `form_field_configs` MODIFY `opsi` JSON NULL;

-- AlterTable
ALTER TABLE `kuisioner_responses` MODIFY `data_jawaban` JSON NOT NULL;

-- AlterTable
ALTER TABLE `luaran` MODIFY `field_tambahan` JSON NULL;

-- AlterTable
ALTER TABLE `proposals` MODIFY `field_tambahan` JSON NULL;

-- CreateIndex
CREATE UNIQUE INDEX `documents_nomor_sk_key` ON `documents`(`nomor_sk`);

-- CreateIndex
CREATE UNIQUE INDEX `documents_nomor_st_key` ON `documents`(`nomor_st`);

