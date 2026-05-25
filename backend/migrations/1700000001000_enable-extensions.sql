-- Up Migration
CREATE TYPE geography AS (
  lat DOUBLE PRECISION,
  lon DOUBLE PRECISION
);

CREATE FUNCTION ST_MakePoint(lon DOUBLE PRECISION, lat DOUBLE PRECISION)
RETURNS geography AS $$
BEGIN
  RETURN ROW(lat, lon)::geography;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE FUNCTION ST_SetSRID(geom geography, srid INTEGER)
RETURNS geography AS $$
BEGIN
  RETURN geom;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE FUNCTION ST_X(geom geography)
RETURNS DOUBLE PRECISION AS $$
BEGIN
  RETURN geom.lon;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE FUNCTION ST_Y(geom geography)
RETURNS DOUBLE PRECISION AS $$
BEGIN
  RETURN geom.lat;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE FUNCTION ST_Distance(g1 geography, g2 geography)
RETURNS DOUBLE PRECISION AS $$
DECLARE
  lat1 DOUBLE PRECISION := g1.lat * pi() / 180;
  lon1 DOUBLE PRECISION := g1.lon * pi() / 180;
  lat2 DOUBLE PRECISION := g2.lat * pi() / 180;
  lon2 DOUBLE PRECISION := g2.lon * pi() / 180;
  dlat DOUBLE PRECISION := lat2 - lat1;
  dlon DOUBLE PRECISION := lon2 - lon1;
  a DOUBLE PRECISION;
  c DOUBLE PRECISION;
  r DOUBLE PRECISION := 6371000; -- Earth radius in meters
BEGIN
  a := sin(dlat/2) * sin(dlat/2) + cos(lat1) * cos(lat2) * sin(dlon/2) * sin(dlon/2);
  c := 2 * asin(sqrt(a));
  RETURN r * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Down Migration
DROP FUNCTION IF EXISTS ST_Distance(geography, geography);
DROP FUNCTION IF EXISTS ST_Y(geography);
DROP FUNCTION IF EXISTS ST_X(geography);
DROP FUNCTION IF EXISTS ST_SetSRID(geography, INTEGER);
DROP FUNCTION IF EXISTS ST_MakePoint(DOUBLE PRECISION, DOUBLE PRECISION);
DROP TYPE IF EXISTS geography CASCADE;

