-- AlterTable
ALTER TABLE `form_field_configs` MODIFY `opsi` JSON NULL;

-- AlterTable
ALTER TABLE `kuisioner_responses` MODIFY `data_jawaban` JSON NOT NULL;

-- AlterTable
ALTER TABLE `luaran` MODIFY `field_tambahan` JSON NULL;

-- AlterTable
ALTER TABLE `proposals` MODIFY `field_tambahan` JSON NULL;

-- CreateIndex
CREATE UNIQUE INDEX `form_field_configs_jenis_proposal_label_key` ON `form_field_configs`(`jenis_proposal`, `label`);

