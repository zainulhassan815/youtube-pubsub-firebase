import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {youtube_v3 as YoutubeApi} from "googleapis";
import {YoutubeRepository} from "./youtube_repository";
import {YOUTUBE_API_KEY} from "../constants";
import {parseStringPromise} from "xml2js";

const app = admin.initializeApp();
const firestore = admin.firestore(app);
const youtubeService = new YoutubeApi.Youtube({auth: YOUTUBE_API_KEY});
const youtubeRepo = new YoutubeRepository(firestore, youtubeService);

/**
 * An endpoint that deals with verification and Youtube Feed.
 */
exports.feed = functions.https.onRequest(
    async (request, response) => {
      try {
        // Check if a challenge is passed in the arguments
        const challenge = request.query["hub.challenge"];
        if (challenge) {
          response.status(200).send(challenge);
          return;
        }

        // Get the actual xml data passed to the request
        const body = request.rawBody;
        if (body) {
          const youtubeFeed = await xmlToJson(body);

          if (youtubeFeed) {
            const video = await youtubeRepo.getVideoFromApi(youtubeFeed.videoId);
            await youtubeRepo.save(video);
          }
        }

        response.status(204).send();
        return;
      } catch (error) {
        console.error(`Failed to create doc in firestore. ${error}`);
        response.status(500).end({error: error});
      }
    });

/**
 * An interface representing basic elements present in the Youtube Feed.
 */
interface YoutubeFeed {
  videoId: string,
  channelId: string | null,
  title: string | null,
  publishedAt: string | null,
  updatedAt: string | null,
}

/**
 * Converts XML string to JSON object
 *
 * @param {string} body xml string to convert into json
 */
async function xmlToJson(
    body: string | Buffer
): Promise<YoutubeFeed | null> {
  try {
    const jsonFeed = await parseStringPromise(body);

    // See File : youtube_feed.sample.json in project for more details on parsing json response
    // Also See : https://jsonpathfinder.com/ for easily determining JSON Paths
    const entry = jsonFeed.feed.entry[0];
    const youtubeFeed: YoutubeFeed = {
      videoId: entry["yt:videoId"][0],
      channelId: entry["yt:channelId"][0],
      title: entry.title[0],
      publishedAt: entry.published[0],
      updatedAt: entry.updated[0],
    };
    return youtubeFeed;
  } catch (error) {
    console.error("Error occurred while parsing XML to JSON.", {error: error});
  }
  return null;
}

