-- CreateTable
CREATE TABLE `program_studi` (
    `id` VARCHAR(36) NOT NULL,
    `kode` VARCHAR(20) NOT NULL,
    `nama` VARCHAR(100) NOT NULL,

    UNIQUE INDEX `program_studi_kode_key`(`kode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `periode_akademik` (
    `id` VARCHAR(36) NOT NULL,
    `nama` VARCHAR(50) NOT NULL,
    `tahun_mulai` INTEGER NOT NULL,
    `tahun_selesai` INTEGER NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `form_field_configs` (
    `id` VARCHAR(36) NOT NULL,
    `jenis_proposal` ENUM('PENELITIAN', 'PENGABDIAN', 'KKN') NOT NULL,
    `label` VARCHAR(150) NOT NULL,
    `tipe_input` VARCHAR(191) NOT NULL,
    `opsi` JSON NULL,
    `wajib` BOOLEAN NOT NULL DEFAULT false,
    `urutan` INTEGER NOT NULL DEFAULT 0,

    INDEX `form_field_configs_jenis_proposal_urutan_idx`(`jenis_proposal`, `urutan`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(36) NOT NULL,
    `nidn` VARCHAR(20) NOT NULL,
    `nama` VARCHAR(150) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `foto` VARCHAR(255) NULL,
    `program_studi_id` VARCHAR(36) NULL,
    `status` ENUM('AKTIF', 'NONAKTIF') NOT NULL DEFAULT 'AKTIF',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_nidn_key`(`nidn`),
    INDEX `users_program_studi_id_idx`(`program_studi_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_roles` (
    `id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `role` ENUM('DOSEN', 'KAPRODI', 'REVIEWER', 'ADMIN', 'KETUA_STIKOM', 'KETUA_LPPM', 'PRODI') NOT NULL,

    INDEX `user_roles_user_id_idx`(`user_id`),
    UNIQUE INDEX `user_roles_user_id_role_key`(`user_id`, `role`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `proposals` (
    `id` VARCHAR(36) NOT NULL,
    `dosen_id` VARCHAR(36) NOT NULL,
    `program_studi_id` VARCHAR(36) NOT NULL,
    `periode_id` VARCHAR(36) NOT NULL,
    `jenis` ENUM('PENELITIAN', 'PENGABDIAN', 'KKN') NOT NULL,
    `judul` VARCHAR(255) NOT NULL,
    `abstrak` TEXT NULL,
    `anggaran` DECIMAL(14, 2) NULL,
    `sumber_dana` ENUM('INTERNAL', 'EKSTERNAL', 'MANDIRI') NULL,
    `field_tambahan` JSON NULL,
    `link_laporan_kemajuan` VARCHAR(191) NULL,
    `link_laporan_akhir` VARCHAR(191) NULL,
    `status` ENUM('DRAFT', 'MENUNGGU_VERIFIKASI_KAPRODI', 'MENUNGGU_VERIFIKASI_ADMIN', 'PERLU_REVISI', 'MENUNGGU_REVIEW', 'PERLU_KEPUTUSAN', 'MENUNGGU_SK_ST', 'LOLOS', 'DITOLAK', 'SELESAI') NOT NULL DEFAULT 'DRAFT',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `proposals_dosen_id_idx`(`dosen_id`),
    INDEX `proposals_program_studi_id_idx`(`program_studi_id`),
    INDEX `proposals_periode_id_idx`(`periode_id`),
    INDEX `proposals_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `proposal_members` (
    `id` VARCHAR(36) NOT NULL,
    `proposal_id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,

    INDEX `proposal_members_user_id_idx`(`user_id`),
    UNIQUE INDEX `proposal_members_proposal_id_user_id_key`(`proposal_id`, `user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `luaran` (
    `id` VARCHAR(36) NOT NULL,
    `proposal_id` VARCHAR(36) NOT NULL,
    `nama_jurnal` VARCHAR(200) NULL,
    `volume` VARCHAR(20) NULL,
    `nomor` VARCHAR(20) NULL,
    `tahun` INTEGER NULL,
    `field_tambahan` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `luaran_proposal_id_idx`(`proposal_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `verifications` (
    `id` VARCHAR(36) NOT NULL,
    `proposal_id` VARCHAR(36) NOT NULL,
    `tahap` ENUM('KAPRODI', 'ADMIN') NOT NULL,
    `verifikator_id` VARCHAR(36) NOT NULL,
    `keputusan` ENUM('SETUJUI', 'REVISI', 'TOLAK') NOT NULL,
    `catatan` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `verifications_verifikator_id_idx`(`verifikator_id`),
    UNIQUE INDEX `verifications_proposal_id_tahap_key`(`proposal_id`, `tahap`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reviews` (
    `id` VARCHAR(36) NOT NULL,
    `proposal_id` VARCHAR(36) NOT NULL,
    `reviewer_id` VARCHAR(36) NOT NULL,
    `urutan_reviewer` INTEGER NOT NULL,
    `skor` INTEGER NULL,
    `rekomendasi` ENUM('TERIMA', 'REVISI', 'TOLAK') NULL,
    `catatan` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `reviews_reviewer_id_idx`(`reviewer_id`),
    UNIQUE INDEX `reviews_proposal_id_urutan_reviewer_key`(`proposal_id`, `urutan_reviewer`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `review_evaluations` (
    `id` VARCHAR(36) NOT NULL,
    `proposal_id` VARCHAR(36) NOT NULL,
    `hasil_kombinasi` ENUM('TERIMA_TERIMA', 'ADA_REVISI', 'TERIMA_TOLAK') NOT NULL,
    `keputusan_akhir` ENUM('LOLOS', 'REVISI', 'DITOLAK') NULL,
    `diputuskan_oleh` VARCHAR(36) NULL,
    `catatan` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `review_evaluations_proposal_id_key`(`proposal_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `documents` (
    `id` VARCHAR(36) NOT NULL,
    `proposal_id` VARCHAR(36) NOT NULL,
    `nomor_sk` VARCHAR(50) NULL,
    `nomor_st` VARCHAR(50) NULL,
    `tanggal_terbit` DATE NULL,
    `file_sk_path` VARCHAR(255) NULL,
    `file_st_path` VARCHAR(255) NULL,
    `dibuat_oleh` VARCHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `documents_proposal_id_key`(`proposal_id`),
    INDEX `documents_dibuat_oleh_idx`(`dibuat_oleh`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `judul` VARCHAR(200) NOT NULL,
    `pesan` TEXT NOT NULL,
    `link` VARCHAR(255) NULL,
    `is_read` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `notifications_user_id_is_read_idx`(`user_id`, `is_read`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `activity_logs` (
    `id` VARCHAR(36) NOT NULL,
    `proposal_id` VARCHAR(36) NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `aksi` VARCHAR(100) NOT NULL,
    `keterangan` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `activity_logs_proposal_id_idx`(`proposal_id`),
    INDEX `activity_logs_user_id_idx`(`user_id`),
    INDEX `activity_logs_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `berita` (
    `id` VARCHAR(36) NOT NULL,
    `judul` VARCHAR(255) NOT NULL,
    `konten` TEXT NOT NULL,
    `gambar` VARCHAR(255) NULL,
    `kategori` VARCHAR(100) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'DRAFT',
    `penulis_id` VARCHAR(36) NOT NULL,
    `published_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `berita_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dokumen_publik` (
    `id` VARCHAR(36) NOT NULL,
    `nama` VARCHAR(200) NOT NULL,
    `file_path` VARCHAR(255) NOT NULL,
    `kategori` VARCHAR(100) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `galeri` (
    `id` VARCHAR(36) NOT NULL,
    `judul` VARCHAR(200) NOT NULL,
    `deskripsi` TEXT NULL,
    `foto_path` VARCHAR(255) NOT NULL,
    `kategori` VARCHAR(100) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `kuisioner_responses` (
    `id` VARCHAR(36) NOT NULL,
    `nama_pengisi` VARCHAR(150) NOT NULL,
    `data_jawaban` JSON NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_program_studi_id_fkey` FOREIGN KEY (`program_studi_id`) REFERENCES `program_studi`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `proposals` ADD CONSTRAINT `proposals_dosen_id_fkey` FOREIGN KEY (`dosen_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `proposals` ADD CONSTRAINT `proposals_program_studi_id_fkey` FOREIGN KEY (`program_studi_id`) REFERENCES `program_studi`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `proposals` ADD CONSTRAINT `proposals_periode_id_fkey` FOREIGN KEY (`periode_id`) REFERENCES `periode_akademik`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `proposal_members` ADD CONSTRAINT `proposal_members_proposal_id_fkey` FOREIGN KEY (`proposal_id`) REFERENCES `proposals`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `proposal_members` ADD CONSTRAINT `proposal_members_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `luaran` ADD CONSTRAINT `luaran_proposal_id_fkey` FOREIGN KEY (`proposal_id`) REFERENCES `proposals`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `verifications` ADD CONSTRAINT `verifications_proposal_id_fkey` FOREIGN KEY (`proposal_id`) REFERENCES `proposals`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `verifications` ADD CONSTRAINT `verifications_verifikator_id_fkey` FOREIGN KEY (`verifikator_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_proposal_id_fkey` FOREIGN KEY (`proposal_id`) REFERENCES `proposals`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_reviewer_id_fkey` FOREIGN KEY (`reviewer_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `review_evaluations` ADD CONSTRAINT `review_evaluations_proposal_id_fkey` FOREIGN KEY (`proposal_id`) REFERENCES `proposals`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `review_evaluations` ADD CONSTRAINT `review_evaluations_diputuskan_oleh_fkey` FOREIGN KEY (`diputuskan_oleh`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documents` ADD CONSTRAINT `documents_proposal_id_fkey` FOREIGN KEY (`proposal_id`) REFERENCES `proposals`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documents` ADD CONSTRAINT `documents_dibuat_oleh_fkey` FOREIGN KEY (`dibuat_oleh`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `activity_logs` ADD CONSTRAINT `activity_logs_proposal_id_fkey` FOREIGN KEY (`proposal_id`) REFERENCES `proposals`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `activity_logs` ADD CONSTRAINT `activity_logs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `berita` ADD CONSTRAINT `berita_penulis_id_fkey` FOREIGN KEY (`penulis_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
