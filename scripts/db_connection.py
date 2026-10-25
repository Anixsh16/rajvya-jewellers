"""TLS-verified provisioning connections. Plaintext is limited to loopback fixtures."""
import pathlib,urllib.parse,psycopg
def connect_database(url,**kwargs):
    parts=urllib.parse.urlparse(url)
    local=parts.hostname in ('localhost','127.0.0.1','::1')
    cert=pathlib.Path(__file__).resolve().parents[1]/'supabase/certs/prod-ca-2021.crt'
    return psycopg.connect(url,sslmode='disable' if local else 'verify-full',sslrootcert=None if local else str(cert),**kwargs)
