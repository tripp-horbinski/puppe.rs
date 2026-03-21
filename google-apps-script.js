// Google Photos Album Fetcher - Google Apps Script
// Fetches photos from a specific Google Photos album and returns them as JSON.
//
// SETUP INSTRUCTIONS:
// 1. Go to https://script.google.com and create a new project
// 2. Paste this entire script into Code.gs
// 3. Enable the Google Photos Library API:
//    a. In Apps Script, click "Services" (+ icon) on the left sidebar
//    b. The Photos Library API won't appear there — instead:
//    c. Go to https://console.cloud.google.com
//    d. Create a new project (or use the one auto-created by Apps Script)
//    e. Enable "Photos Library API" from the API Library
//    f. In Apps Script, go to Project Settings > GCP Project
//    g. Link your Apps Script to that GCP project by entering the project number
// 4. Set your album name in the ALBUM_NAME variable below
// 5. Deploy as a web app:
//    a. Click Deploy > New deployment
//    b. Type: Web app
//    c. Execute as: Me
//    d. Who has access: Anyone
//    e. Click Deploy and authorize when prompted
// 6. Copy the web app URL and paste it into your index.html as APPS_SCRIPT_URL

const ALBUM_NAME = "puppe.rs"; // Change this to your album name

function doGet() {
  try {
    const photos = getPhotosFromAlbum(ALBUM_NAME);
    return ContentService
      .createTextOutput(JSON.stringify({ photos: photos }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (e) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: e.message, photos: [] }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getPhotosFromAlbum(albumName) {
  // Find the album by name
  const albumId = findAlbumId(albumName);
  if (!albumId) {
    throw new Error("Album '" + albumName + "' not found");
  }

  // Fetch all photos from the album
  const photos = [];
  let pageToken = "";

  do {
    const response = UrlFetchApp.fetch(
      "https://photoslibrary.googleapis.com/v1/mediaItems:search",
      {
        method: "post",
        contentType: "application/json",
        headers: {
          Authorization: "Bearer " + ScriptApp.getOAuthToken()
        },
        payload: JSON.stringify({
          albumId: albumId,
          pageSize: 100,
          pageToken: pageToken
        })
      }
    );

    const data = JSON.parse(response.getContentText());
    if (data.mediaItems) {
      data.mediaItems.forEach(function(item) {
        // Only include photos (not videos)
        if (item.mimeType && item.mimeType.startsWith("image/")) {
          photos.push({
            url: item.baseUrl + "=w1920-h1080",
            description: item.description || item.filename || ""
          });
        }
      });
    }

    pageToken = data.nextPageToken || "";
  } while (pageToken);

  return photos;
}

function findAlbumId(albumName) {
  let pageToken = "";

  do {
    const url = "https://photoslibrary.googleapis.com/v1/albums?pageSize=50"
      + (pageToken ? "&pageToken=" + pageToken : "");

    const response = UrlFetchApp.fetch(url, {
      headers: {
        Authorization: "Bearer " + ScriptApp.getOAuthToken()
      }
    });

    const data = JSON.parse(response.getContentText());
    if (data.albums) {
      for (let i = 0; i < data.albums.length; i++) {
        if (data.albums[i].title === albumName) {
          return data.albums[i].id;
        }
      }
    }

    pageToken = data.nextPageToken || "";
  } while (pageToken);

  return null;
}

// This comment triggers the OAuth scope for Photos access
// DriveApp.getFiles() — not called, just ensures the OAuth scope prompt appears
