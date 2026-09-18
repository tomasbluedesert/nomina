-- CreateEnum
CREATE TYPE "Periodicidad" AS ENUM ('quincenal', 'mensual', 'personalizado');

-- CreateEnum
CREATE TYPE "TipoCalculo" AS ENUM ('mensual_fijo', 'quincenal_fijo', 'diario_x_dias');

-- CreateEnum
CREATE TYPE "Estatus" AS ENUM ('activo', 'baja');

-- CreateEnum
CREATE TYPE "EstadoParams" AS ENUM ('borrador', 'vigente', 'vencido');

-- CreateEnum
CREATE TYPE "TipoEscenario" AS ENUM ('actual', 'propuesto', 'presupuesto');

-- CreateEnum
CREATE TYPE "AccionEscenario" AS ENUM ('mantener', 'incremento', 'alta', 'baja');

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "razonSocial" TEXT NOT NULL,
    "rfc" TEXT NOT NULL,
    "registroPatronal" TEXT,
    "estadoIsn" TEXT NOT NULL DEFAULT 'BCS',
    "primaRiesgo" DECIMAL(7,5) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostCenter" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,

    CONSTRAINT "CostCenter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "numeroEmpleado" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "puesto" TEXT NOT NULL,
    "rfc" TEXT NOT NULL,
    "curp" TEXT,
    "nss" TEXT,
    "fechaIngreso" DATE NOT NULL,
    "estatus" "Estatus" NOT NULL DEFAULT 'activo',
    "costCenterId" TEXT,
    "tipoContratacion" TEXT,
    "sueldoDiarioFiscal" DECIMAL(12,2) NOT NULL,
    "netoPactado" DECIMAL(12,2) NOT NULL,
    "periodicidad" "Periodicidad" NOT NULL,
    "tipoCalculo" "TipoCalculo" NOT NULL,
    "zonaFrontera" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FiscalParamSet" (
    "id" TEXT NOT NULL,
    "ejercicio" INTEGER NOT NULL,
    "version" INTEGER NOT NULL,
    "vigenciaDesde" DATE NOT NULL,
    "vigenciaHasta" DATE NOT NULL,
    "estado" "EstadoParams" NOT NULL DEFAULT 'borrador',
    "data" JSONB NOT NULL,
    "hashSha256" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FiscalParamSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollPeriod" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "tipo" "Periodicidad" NOT NULL,
    "fechaInicio" DATE NOT NULL,
    "fechaFin" DATE NOT NULL,
    "paramSetId" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'abierto',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayrollPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollCalculation" (
    "id" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "paramSetId" TEXT NOT NULL,
    "paramSetHash" TEXT NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "calculatedBy" TEXT,
    "inputSnapshot" JSONB NOT NULL,
    "result" JSONB NOT NULL,
    "warnings" JSONB NOT NULL,

    CONSTRAINT "PayrollCalculation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scenario" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" "TipoEscenario" NOT NULL,
    "presupuestoObjetivo" DECIMAL(14,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Scenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScenarioLine" (
    "id" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "employeeId" TEXT,
    "accion" "AccionEscenario" NOT NULL,
    "nombre" TEXT,
    "netoPactado" DECIMAL(12,2) NOT NULL,
    "sueldoDiario" DECIMAL(12,2) NOT NULL,
    "fechaEfectiva" DATE,

    CONSTRAINT "ScenarioLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSetting" (
    "companyId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("companyId","key")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_rfc_key" ON "Company"("rfc");

-- CreateIndex
CREATE UNIQUE INDEX "CostCenter_companyId_nombre_key" ON "CostCenter"("companyId", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_companyId_numeroEmpleado_key" ON "Employee"("companyId", "numeroEmpleado");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_companyId_rfc_key" ON "Employee"("companyId", "rfc");

-- CreateIndex
CREATE UNIQUE INDEX "FiscalParamSet_ejercicio_version_key" ON "FiscalParamSet"("ejercicio", "version");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollPeriod_companyId_fechaInicio_fechaFin_key" ON "PayrollPeriod"("companyId", "fechaInicio", "fechaFin");

-- CreateIndex
CREATE INDEX "PayrollCalculation_employeeId_calculatedAt_idx" ON "PayrollCalculation"("employeeId", "calculatedAt");

-- CreateIndex
CREATE INDEX "PayrollCalculation_periodId_idx" ON "PayrollCalculation"("periodId");

-- AddForeignKey
ALTER TABLE "CostCenter" ADD CONSTRAINT "CostCenter_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "CostCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollPeriod" ADD CONSTRAINT "PayrollPeriod_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollPeriod" ADD CONSTRAINT "PayrollPeriod_paramSetId_fkey" FOREIGN KEY ("paramSetId") REFERENCES "FiscalParamSet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollCalculation" ADD CONSTRAINT "PayrollCalculation_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "PayrollPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollCalculation" ADD CONSTRAINT "PayrollCalculation_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollCalculation" ADD CONSTRAINT "PayrollCalculation_paramSetId_fkey" FOREIGN KEY ("paramSetId") REFERENCES "FiscalParamSet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scenario" ADD CONSTRAINT "Scenario_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScenarioLine" ADD CONSTRAINT "ScenarioLine_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "Scenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScenarioLine" ADD CONSTRAINT "ScenarioLine_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppSetting" ADD CONSTRAINT "AppSetting_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
