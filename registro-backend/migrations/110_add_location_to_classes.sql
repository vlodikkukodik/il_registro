-- Migration: 110_add_location_to_classes
-- Description: classes/repository.go reads/writes classes.location, but no
-- prior migration ever created it.

ALTER TABLE classes ADD COLUMN IF NOT EXISTS location VARCHAR(200);
