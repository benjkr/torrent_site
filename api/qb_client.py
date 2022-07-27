from qbittorrent import Client
import pprint

qb = Client('http://127.0.0.1:8080/')

qb.login(password="Password123")
# not required when 'Bypass from localhost' setting is active.
# defaults to admin:admin.
# to use defaults, just do qb.login()

print(qb.torrents())



if __name__ == '__main__':
    torrents = qb.torrents()

    magnet = "magnet:?xt=urn:btih:2C6B6858D61DA9543D4231A71DB4B1C9264B0685&dn=Ubuntu%2022.04%20LTS"

    for torrent in torrents:
        pprint.pprint(torrent)

    qb.download_from_link(magnet)