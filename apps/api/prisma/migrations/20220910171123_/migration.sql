-- CreateTable
CREATE TABLE "nested_project_level_1" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "project_id" INTEGER NOT NULL,

    CONSTRAINT "nested_project_level_1_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nested_project_level_2" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "project_id" INTEGER NOT NULL,

    CONSTRAINT "nested_project_level_2_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "nested_project_level_1" ADD CONSTRAINT "nested_project_level_1_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nested_project_level_2" ADD CONSTRAINT "nested_project_level_2_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "nested_project_level_1"("id") ON DELETE CASCADE ON UPDATE CASCADE;
