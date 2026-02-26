-- CreateEnum
CREATE TYPE "PackingNeedType" AS ENUM ('TO_BUY', 'TO_TAKE');

-- AlterTable
ALTER TABLE "PackingCatalogItem"
ADD COLUMN "needType" "PackingNeedType" NOT NULL DEFAULT 'TO_TAKE';

-- AlterTable
ALTER TABLE "TripPackingItem"
ADD COLUMN "needType" "PackingNeedType" NOT NULL DEFAULT 'TO_TAKE';
