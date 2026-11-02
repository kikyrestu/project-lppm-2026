-- AlterTable
ALTER TABLE `form_field_configs` MODIFY `opsi` JSON NULL;

-- AlterTable
ALTER TABLE `kuisioner_responses` ADD COLUMN `kuisioner_id` VARCHAR(36) NULL,
    MODIFY `data_jawaban` JSON NOT NULL;

-- AlterTable
ALTER TABLE `luaran` MODIFY `field_tambahan` JSON NULL;

-- AlterTable
ALTER TABLE `proposals` MODIFY `field_tambahan` JSON NULL;

-- CreateTable
CREATE TABLE `kuisioner` (
    `id` VARCHAR(36) NOT NULL,
    `judul` VARCHAR(200) NOT NULL,
    `deskripsi` TEXT NULL,
    `pertanyaan` JSON NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'DRAFT',
    `dibuat_oleh` VARCHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `kuisioner_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `kuisioner_responses_kuisioner_id_idx` ON `kuisioner_responses`(`kuisioner_id`);

-- AddForeignKey
ALTER TABLE `kuisioner` ADD CONSTRAINT `kuisioner_dibuat_oleh_fkey` FOREIGN KEY (`dibuat_oleh`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `kuisioner_responses` ADD CONSTRAINT `kuisioner_responses_kuisioner_id_fkey` FOREIGN KEY (`kuisioner_id`) REFERENCES `kuisioner`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

