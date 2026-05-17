/*
  # Add get_secret RPC helper

  Allows edge functions to retrieve decrypted secrets from vault by name.
  Restricted to service_role only.
*/

CREATE OR REPLACE FUNCTION get_secret(secret_name text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = vault, public
AS $$
  SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = secret_name LIMIT 1;
$$;

REVOKE ALL ON FUNCTION get_secret(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_secret(text) TO service_role;
