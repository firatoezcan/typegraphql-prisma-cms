/*
  Warnings:

  - You are about to drop the column `user_id` on the `awards` table. All the data in the column will be lost.
  - Added the required column `project_id` to the `awards` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "awards" DROP CONSTRAINT "awards_user_id_fkey";

-- AlterTable
ALTER TABLE "awards" DROP COLUMN "user_id",
ADD COLUMN     "project_id" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "awards" ADD CONSTRAINT "awards_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
