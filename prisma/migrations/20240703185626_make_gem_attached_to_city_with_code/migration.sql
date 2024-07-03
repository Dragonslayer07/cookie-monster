/*
  Warnings:

  - You are about to drop the column `cityId` on the `Gem` table. All the data in the column will be lost.
  - Added the required column `cityCode` to the `Gem` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Gem" DROP CONSTRAINT "Gem_cityId_fkey";

-- AlterTable
ALTER TABLE "Gem" DROP COLUMN "cityId",
ADD COLUMN     "cityCode" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Gem" ADD CONSTRAINT "Gem_cityCode_fkey" FOREIGN KEY ("cityCode") REFERENCES "City"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
