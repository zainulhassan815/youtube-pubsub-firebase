import {YOUTUBE_FIRESTORE_COLLECTION} from "../constants";
import {youtube_v3 as YoutubeApi} from "googleapis";

/**
 * An interface representing youtube video.
 */
export interface Video {
    /**
     * The unique id of the video.
     */

    id: string,

    /**
     * Video title.
     */
    title: string,

    /**
     * Video description.
     */
    description: string,

    /**
     * Video publish date.
     */
    publishData: string,

    /**
     * The tags related to video.
     */
    tags: string[]
}

/**
 * YoutubeRepository can be used to store data in firestore
 * as well as to fetch video details or list of all the videos in youtube.
 *
 * @param {FirebaseFirestore.Firestore} firestore Firestore instance to save/update data.
 * @param {YoutubeApi.Youtube} youtubeService Youtube instance from GoogleApis to fetch video details.
 */
export class YoutubeRepository {
  constructor(
      private firestore: FirebaseFirestore.Firestore,
      private youtubeService: YoutubeApi.Youtube,
  ) {}

  /**
  * Save a video to firestore. If the video already exists in firestore,
  * then it updates the already present video.
  *
  * @param {Video} video The video object that is to be saved in firestore.
  * @return {boolean} true if document is create successfully else false.
  */
  async save(
      video: Video
  ): Promise<boolean> {
    try {
      const doc = await this.getDocFromFirestore(video.id);
      const videoDoc = this.firestore
          .collection(YOUTUBE_FIRESTORE_COLLECTION)
          .doc(video.id);

      if (doc && doc.exists) {
        // Update doc
        await videoDoc.update(video);
      } else {
        // create new doc
        await videoDoc.set(video);
      }
      return true;
    } catch (error) {
      console.error("Error occurred while saving video to firstore.", video);
    }
    return false;
  }

  /**
   * Get document from firestore.
   *
   * @param {string} id The unique of document in firestore (video id in this case).
   * @return {FirebaseFirestore.DocumentSnapshot | null} returns document from firestore.
   */
  async getDocFromFirestore(
      id: string
  ): Promise<FirebaseFirestore.DocumentSnapshot | null> {
    try {
      const reference = this.firestore
          .collection(YOUTUBE_FIRESTORE_COLLECTION)
          .doc(id);
      const doc = await reference.get();
      return doc;
    } catch (error) {
      console.error("Error occurred while getting document.", {id: id, error: error});
    }
    return null;
  }

  /**
   * Get a single video from YoutubeApi.
   *
   * @param {string} id The unique id of the youtube video.
   * @return {Video} Video
   */
  async getVideoFromApi(id: string): Promise<Video> {
    const result = await this.youtubeService.videos.list({
      id: [id],
      part: ["snippet"],
    });

    // Parse data
    const youtubeVideo = result.data.items?.[0];
    if (youtubeVideo) {
      return {
        id: youtubeVideo.id ?? "",
        title: youtubeVideo.snippet?.title ?? "",
        description: youtubeVideo.snippet?.description ?? "",
        publishData: youtubeVideo.snippet?.publishedAt ?? "",
        tags: youtubeVideo.snippet?.tags ?? [],
      };
    } else {
      throw new Error(`No video found for given id.${id}`);
    }
  }
}
