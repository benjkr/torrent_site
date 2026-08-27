import { describe, expect, test } from "bun:test";
import {
  formatYtsType,
  isYtsSearchId,
  mapYtsMoviesToItems,
  ytsListUrl,
  ytsTorrentName,
} from "./yts.server";

const movie = {
  id: 42,
  imdb_code: "tt0111161",
  title: "The Shawshank Redemption",
  title_english: "The Shawshank Redemption",
  year: 1994,
  torrents: [
    {
      hash: "ABCDEF1234567890",
      quality: "1080p",
      type: "bluray",
      video_codec: "x264",
      seeds: 120,
      peers: 8,
      size: "1.71 GB",
      size_bytes: 1835008000,
      date_uploaded_unix: 1600000000,
    },
    {
      hash: "FFFF0000",
      quality: "2160p",
      type: "web",
      video_codec: "x265",
      seeds: 40,
      peers: 2,
      size_bytes: 5000000000,
      date_uploaded_unix: 1600001000,
    },
    {
      quality: "720p",
      type: "webrip",
      seeds: 1,
      peers: 0,
      size_bytes: 100,
    },
  ],
};

describe("yts.server", () => {
  test("ytsListUrl encodes query_term", () => {
    expect(ytsListUrl("tt0111161")).toBe(
      "https://movies-api.accel.li/api/v2/list_movies.json?query_term=tt0111161&limit=20",
    );
  });

  test("formatYtsType maps common YTS types", () => {
    expect(formatYtsType("bluray")).toBe("BluRay");
    expect(formatYtsType("web")).toBe("WEB-DL");
    expect(formatYtsType("webrip")).toBe("WEBRip");
  });

  test("ytsTorrentName includes title year quality type codec", () => {
    expect(ytsTorrentName(movie, movie.torrents[0]!)).toBe(
      "The Shawshank Redemption (1994) 1080p BluRay x264",
    );
  });

  test("mapYtsMoviesToItems expands torrents and skips missing hashes", () => {
    const items = mapYtsMoviesToItems([movie]);
    expect(items).toHaveLength(2);

    const hd = items[0]!;
    expect(hd.tracker).toBe("yts");
    expect(hd.id).toBe("yts-42-ABCDEF1234567890");
    expect(hd.info_hash).toBe("ABCDEF1234567890");
    expect(hd.size).toBe("1835008000");
    expect(hd.seeders).toBe("120");
    expect(hd.leechers).toBe("8");
    expect(hd.added).toBe("1600000000");
    expect(hd.imdb).toBe("tt0111161");
    expect(hd.username).toBe("YTS");
    expect(hd.status).toBe("trusted");
    expect(hd.num_files).toBe("1");
    expect(hd.files).toEqual([]);
    expect(hd.name).toContain("1080p");
    expect(hd.name).toContain("BluRay");

    expect(items[1]!.name).toContain("2160p");
    expect(items[1]!.name).toContain("WEB-DL");
    expect(items[1]!.name).toContain("x265");
  });

  test("isYtsSearchId", () => {
    expect(isYtsSearchId("yts-42-abc")).toBe(true);
    expect(isYtsSearchId("12345")).toBe(false);
  });
});
