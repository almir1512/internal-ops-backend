/*
  Warnings:

  - Changed the type of `action` on the `RequestAction` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `fromStatus` on the `RequestAction` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `toStatus` on the `RequestAction` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `name` on the `Role` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `status` on the `ServiceRequest` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "RoleName" AS ENUM ('ADMIN', 'APPROVER', 'REQUESTER');

-- CreateEnum
CREATE TYPE "ServiceRequestStatus" AS ENUM ('SUBMITTED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RequestActionType" AS ENUM ('SUBMIT', 'APPROVE', 'REJECT');

-- AlterTable
ALTER TABLE "RequestAction" DROP COLUMN "action",
ADD COLUMN     "action" "RequestActionType" NOT NULL,
DROP COLUMN "fromStatus",
ADD COLUMN     "fromStatus" "ServiceRequestStatus" NOT NULL,
DROP COLUMN "toStatus",
ADD COLUMN     "toStatus" "ServiceRequestStatus" NOT NULL;

-- AlterTable
ALTER TABLE "Role" DROP COLUMN "name",
ADD COLUMN     "name" "RoleName" NOT NULL;

-- AlterTable
ALTER TABLE "ServiceRequest" DROP COLUMN "status",
ADD COLUMN     "status" "ServiceRequestStatus" NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");
