-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "idToken" TEXT;

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "activeOrganizationId" TEXT;
