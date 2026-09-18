-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "departmentId" TEXT;

-- CreateTable
CREATE TABLE "Puesto" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "Puesto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Puesto_companyId_nombre_key" ON "Puesto"("companyId", "nombre");

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "CostCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
