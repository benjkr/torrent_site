# flask app. rest api
from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import logging
from qb_client import qb

logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s [%(levelname)s]  %(message)s')


def fix_space(string):
    return string.replace(" ", "%20")


PORT = 5000

app = Flask(__name__)
CORS(app)


def get_data_json(url):
    response = requests.get(url)
    data = response.json()
    logging.info(f"{url}")
    return data


def get_data_piratebay(query):
    url = f"https://apibay.org/q.php?q={query}"
    torrents = get_data_json(url)[:5]
    torrents = [{**torrent, "files": get_data_json(
        f"https://apibay.org/f.php?id={torrent['id']}")} for torrent in torrents]
    return torrents


@app.route('/search', methods=['GET'])
def get_query():
    query = request.args.get('query')
    return jsonify(get_data_piratebay(query))

# magnet:?xt=urn:btih:2C6B6858D61DA9543D4231A71DB4B1C9264B0685&dn=Ubuntu%2022.04%20LTS&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.openbittorrent.com%3A6969%2Fannounce&tr=udp%3A%2F%2F9.rarbg.to%3A2710%2Fannounce&tr=udp%3A%2F%2F9.rarbg.me%3A2780%2Fannounce&tr=udp%3A%2F%2Fopen.demonii.com%3A1337%2Fannounce&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337&tr=http%3A%2F%2Fp4p.arenabg.com%3A1337%2Fannounce&tr=udp%3A%2F%2Ftracker.torrent.eu.org%3A451%2Fannounce&tr=udp%3A%2F%2Ftracker.tiny-vps.com%3A6969%2Fannounce&tr=udp%3A%2F%2Fopen.stealth.si%3A80%2Fannounce


@app.route('/download/', methods=['GET'])
def download_by_hash():
    hash_id = request.args.get('hash')
    torrent_name = request.args.get('name')
    magnet = f"magnet:?xt=urn:btih:{hash_id}&dn={fix_space(torrent_name)}"
    qb.download_from_link(magnet)
    return jsonify({"status": "ok"})


@app.route('/get_active/', methods=['GET'])
def get_active():
    return jsonify(qb.torrents())


if __name__ == '__main__':
    app.run(host='', port=PORT, debug=True)
