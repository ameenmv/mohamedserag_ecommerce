-- Gives the existing categories their identity (accent and illustration) instead of the shared
-- default, so no category page looks like another. Only touches rows still on the defaults.
UPDATE "categories" SET "accent" = 'deep-teal', "illustration" = 'fridge' WHERE "slug" = 'refrigerators' AND "accent" = 'green' AND "illustration" = 'default';
UPDATE "categories" SET "accent" = 'charcoal', "illustration" = 'washer' WHERE "slug" = 'washers' AND "accent" = 'green' AND "illustration" = 'default';
UPDATE "categories" SET "accent" = 'plum', "illustration" = 'tv' WHERE "slug" = 'tvs' AND "accent" = 'green' AND "illustration" = 'default';
UPDATE "categories" SET "accent" = 'sand', "illustration" = 'ac' WHERE "slug" = 'acs' AND "accent" = 'green' AND "illustration" = 'default';
UPDATE "categories" SET "accent" = 'clay', "illustration" = 'cooker' WHERE "slug" = 'cookers' AND "accent" = 'green' AND "illustration" = 'default';
UPDATE "categories" SET "accent" = 'gold', "illustration" = 'cookware' WHERE "slug" = 'cookware' AND "accent" = 'green' AND "illustration" = 'default';
UPDATE "categories" SET "accent" = 'olive', "illustration" = 'small-appliances' WHERE "slug" = 'small-appliances' AND "accent" = 'green' AND "illustration" = 'default';
UPDATE "categories" SET "illustration" = 'household' WHERE "slug" = 'household' AND "illustration" = 'default';
