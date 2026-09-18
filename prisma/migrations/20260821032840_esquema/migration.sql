-- CreateEnum
CREATE TYPE "Esquema" AS ENUM ('fiscal', 'mixto', 'asimilables');

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "esquema" "Esquema" NOT NULL DEFAULT 'mixto';
