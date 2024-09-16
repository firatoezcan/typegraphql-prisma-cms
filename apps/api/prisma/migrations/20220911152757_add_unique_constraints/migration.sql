/*
  Warnings:

  - You are about to drop the column `dontUse` on the `PlaylistTrack` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[AlbumId]` on the table `Album` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[ArtistId]` on the table `Artist` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[CustomerId]` on the table `Customer` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[EmployeeId]` on the table `Employee` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[GenreId]` on the table `Genre` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[InvoiceId]` on the table `Invoice` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[InvoiceLineId]` on the table `InvoiceLine` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[MediaTypeId]` on the table `MediaType` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[PlaylistId]` on the table `Playlist` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[PlayListTrackId]` on the table `PlaylistTrack` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[TrackId]` on the table `Track` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "PlaylistTrack" DROP COLUMN "dontUse",
ADD COLUMN     "PlayListTrackId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Album_AlbumId_key" ON "Album"("AlbumId");

-- CreateIndex
CREATE UNIQUE INDEX "Artist_ArtistId_key" ON "Artist"("ArtistId");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_CustomerId_key" ON "Customer"("CustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_EmployeeId_key" ON "Employee"("EmployeeId");

-- CreateIndex
CREATE UNIQUE INDEX "Genre_GenreId_key" ON "Genre"("GenreId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_InvoiceId_key" ON "Invoice"("InvoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceLine_InvoiceLineId_key" ON "InvoiceLine"("InvoiceLineId");

-- CreateIndex
CREATE UNIQUE INDEX "MediaType_MediaTypeId_key" ON "MediaType"("MediaTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "Playlist_PlaylistId_key" ON "Playlist"("PlaylistId");

-- CreateIndex
CREATE UNIQUE INDEX "PlaylistTrack_PlayListTrackId_key" ON "PlaylistTrack"("PlayListTrackId");

-- CreateIndex
CREATE UNIQUE INDEX "Track_TrackId_key" ON "Track"("TrackId");
