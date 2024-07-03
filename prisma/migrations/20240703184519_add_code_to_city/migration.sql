/*
  Warnings:

  - Added the required column `code` to the `City` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "City" ADD COLUMN     "code" TEXT NOT NULL;
