-- CreateTable
CREATE TABLE "PagoExtra" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "fechaInicio" DATE NOT NULL,
    "fechaFin" DATE NOT NULL,
    "concepto" TEXT NOT NULL,
    "importe" DECIMAL(12,2) NOT NULL,
    "destino" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "PagoExtra_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PagoExtra_companyId_fechaInicio_fechaFin_idx" ON "PagoExtra"("companyId", "fechaInicio", "fechaFin");

-- AddForeignKey
ALTER TABLE "PagoExtra" ADD CONSTRAINT "PagoExtra_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
