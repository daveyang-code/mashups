"use client";

import { useEffect, useRef, useState } from "react";

import Head from "next/head";
import ReactPlayer from "react-player";

interface VideoItem {
  id: number;
  url: string;
  startTime: number;
  endTime: number;
  title: string;
}

interface NewVideoItem {
  url: string;
  startTime: number | string;
  endTime: number | string;
  title: string;
}

interface ExportedPlaylist {
  name: string;
  items: Omit<VideoItem, "id">[];
}

export default function Home() {
  const [playlist, setPlaylist] = useState<VideoItem[]>([]);
  const [currentVideo, setCurrentVideo] = useState<VideoItem | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [newVideo, setNewVideo] = useState<NewVideoItem>({
    url: "",
    startTime: 0,
    endTime: 0,
    title: "",
  });
  const [playlistName, setPlaylistName] = useState<string>("My Mashup");
  const [editingVideo, setEditingVideo] = useState<VideoItem | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  // Add a key state to force player reload
  const [playerKey, setPlayerKey] = useState<number>(0);
  const playerRef = useRef<ReactPlayer | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle video playback progression
  useEffect(() => {
    if (playlist.length > 0 && currentIndex < playlist.length) {
      setCurrentVideo(playlist[currentIndex]);
      // Force player to reload when changing videos by updating the key
      setPlayerKey((prevKey) => prevKey + 1);
    } else if (playlist.length > 0 && currentIndex >= playlist.length) {
      // Reset to beginning when playlist is finished
      setCurrentIndex(0);
      setIsPlaying(false);
    }
  }, [currentIndex, playlist]);

  // Handle end of current clip
  const handleProgress = (progress: { playedSeconds: number }) => {
    if (currentVideo && progress.playedSeconds >= currentVideo.endTime) {
      setCurrentIndex((prevIndex) => prevIndex + 1);
    }
  };

  // Add a new video to the playlist
  const handleAddVideo = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !newVideo.url ||
      newVideo.startTime === null ||
      newVideo.endTime === null
    )
      return;

    const videoToAdd: VideoItem = {
      id: Date.now(),
      url: newVideo.url,
      startTime: parseFloat(newVideo.startTime.toString()),
      endTime: parseFloat(newVideo.endTime.toString()),
      title: newVideo.title,
    };

    setPlaylist([...playlist, videoToAdd]);
    setNewVideo({
      url: "",
      startTime: 0,
      endTime: 0,
      title: "",
    });
  };

  // Set up editing for a video
  const handleEditVideo = (video: VideoItem) => {
    setEditingVideo(video);
    setNewVideo({
      url: video.url,
      startTime: video.startTime,
      endTime: video.endTime,
      title: video.title,
    });
    setIsEditing(true);
  };

  // Save edited video
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVideo || !newVideo.url) return;

    const updatedPlaylist = playlist.map((video) =>
      video.id === editingVideo.id
        ? {
            ...video,
            url: newVideo.url,
            startTime: parseFloat(newVideo.startTime.toString()),
            endTime: parseFloat(newVideo.endTime.toString()),
            title: newVideo.title,
          }
        : video
    );

    setPlaylist(updatedPlaylist);
    setIsEditing(false);
    setEditingVideo(null);
    setNewVideo({
      url: "",
      startTime: 0,
      endTime: 0,
      title: "",
    });

    // If editing the current playing video, update it and force reload
    if (currentVideo && currentVideo.id === editingVideo.id) {
      const updatedVideo = updatedPlaylist.find(
        (v) => v.id === editingVideo.id
      );
      if (updatedVideo) {
        setCurrentVideo(updatedVideo);
        setPlayerKey((prevKey) => prevKey + 1);
      }
    }
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingVideo(null);
    setNewVideo({
      url: "",
      startTime: 0,
      endTime: 0,
      title: "",
    });
  };

  // Duplicate a video in the playlist
  const handleDuplicateVideo = (video: VideoItem) => {
    const duplicatedVideo: VideoItem = {
      ...video,
      id: Date.now(),
      title: `${video.title} (Copy)`,
    };
    setPlaylist([...playlist, duplicatedVideo]);
  };

  // Remove a video from the playlist
  const handleRemoveVideo = (id: number) => {
    setPlaylist(playlist.filter((video) => video.id !== id));
  };

  // Start playback
  const handlePlay = () => {
    if (playlist.length === 0) return;
    setCurrentIndex(0);
    setIsPlaying(true);
  };

  // Stop playback
  const handleStop = () => {
    setIsPlaying(false);
  };

  // Move video up in playlist
  const moveUp = (index: number) => {
    if (index === 0) return;
    const newPlaylist = [...playlist];
    [newPlaylist[index], newPlaylist[index - 1]] = [
      newPlaylist[index - 1],
      newPlaylist[index],
    ];
    setPlaylist(newPlaylist);
  };

  // Move video down in playlist
  const moveDown = (index: number) => {
    if (index === playlist.length - 1) return;
    const newPlaylist = [...playlist];
    [newPlaylist[index], newPlaylist[index + 1]] = [
      newPlaylist[index + 1],
      newPlaylist[index],
    ];
    setPlaylist(newPlaylist);
  };

  // Export playlist as JSON
  const exportPlaylist = () => {
    // Strip IDs from the playlist items as they'll be regenerated on import
    const exportData: ExportedPlaylist = {
      name: playlistName,
      items: playlist.map(({ id, ...rest }) => rest),
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(
      dataStr
    )}`;

    const exportFileDefaultName = `${playlistName
      .replace(/\s+/g, "-")
      .toLowerCase()}-mashup.json`;

    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileDefaultName);
    linkElement.click();
  };

  // Trigger file input click
  const triggerImportDialog = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Import playlist from JSON file
  const importPlaylist = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(
          event.target?.result as string
        ) as ExportedPlaylist;

        // Reset player if it was playing
        setIsPlaying(false);
        setCurrentIndex(0);
        setCurrentVideo(null);

        // Set playlist name
        if (importedData.name) {
          setPlaylistName(importedData.name);
        }

        // Create new playlist with fresh IDs
        const newPlaylist = importedData.items.map((item) => ({
          ...item,
          id: Date.now() + Math.random(),
        }));

        setPlaylist(newPlaylist);
      } catch (error) {
        alert(
          "Error importing playlist. Please make sure the file is valid JSON."
        );
        console.error("Import error:", error);
      }
    };
    reader.readAsText(file);

    // Reset file input so the same file can be imported again if needed
    e.target.value = "";
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Head>
        <title>YouTube Mashup Creator</title>
        <meta
          name="description"
          content="Create video mashups from YouTube videos"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-center">
          YouTube Mashup Creator
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Video Player Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              {/* Video Container - Fixed aspect ratio container */}
              <div className="relative pt-[56.25%] bg-black">
                {" "}
                {/* 16:9 aspect ratio = 9/16 = 0.5625 = 56.25% */}
                {currentVideo ? (
                  <div className="absolute top-0 left-0 w-full h-full">
                    <ReactPlayer
                      key={playerKey} // Add key to force remounting
                      ref={playerRef}
                      url={currentVideo.url}
                      playing={isPlaying}
                      controls={true}
                      width="100%"
                      height="100%"
                      onProgress={handleProgress}
                      progressInterval={500}
                      config={{
                        youtube: {
                          playerVars: {
                            start: Math.floor(currentVideo.startTime),
                          },
                        },
                      }}
                      // Directly seek to the start time when the player is ready
                      onReady={(player) => {
                        if (player && currentVideo) {
                          player.seekTo(currentVideo.startTime);
                        }
                      }}
                    />
                  </div>
                ) : (
                  <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center text-gray-500">
                    <p>Add videos to your playlist and press Play</p>
                  </div>
                )}
              </div>
              <div className="p-4 flex justify-center space-x-4">
                <button
                  onClick={handlePlay}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-md"
                  disabled={playlist.length === 0}
                >
                  Play Mashup
                </button>
                <button
                  onClick={handleStop}
                  className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-md"
                  disabled={!isPlaying}
                >
                  Stop
                </button>
              </div>
            </div>

            {/* Status */}
            <div className="mt-4 p-4 bg-white rounded-lg shadow-md">
              <p className="text-center">
                {isPlaying && currentVideo ? (
                  <>
                    Now playing:{" "}
                    <span className="font-semibold">
                      {currentVideo.title || "Untitled"}
                    </span>
                    ({currentVideo.startTime}s - {currentVideo.endTime}s)
                  </>
                ) : (
                  "Ready to play"
                )}
              </p>
            </div>
          </div>

          {/* Playlist Management Section */}
          <div className="bg-white rounded-lg shadow-md p-4">
            {/* Playlist Title and Export/Import */}
            <div className="mb-4">
              <div className="flex items-center mb-2">
                <input
                  type="text"
                  value={playlistName}
                  onChange={(e) => setPlaylistName(e.target.value)}
                  className="flex-1 p-2 border border-gray-300 rounded-md mr-2 font-semibold"
                  placeholder="Playlist Name"
                />
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={exportPlaylist}
                  disabled={playlist.length === 0}
                  className={`flex-1 py-2 rounded-md text-sm ${
                    playlist.length === 0
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-purple-500 hover:bg-purple-600 text-white"
                  }`}
                >
                  Export Playlist
                </button>
                <button
                  onClick={triggerImportDialog}
                  className="flex-1 bg-teal-500 hover:bg-teal-600 text-white py-2 rounded-md text-sm"
                >
                  Import Playlist
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={importPlaylist}
                  accept=".json"
                  className="hidden"
                />
              </div>
            </div>

            <h2 className="text-xl font-semibold mb-4">Your Mashup Playlist</h2>

            {/* Add/Edit Video Form */}
            <form
              onSubmit={isEditing ? handleSaveEdit : handleAddVideo}
              className="mb-6"
            >
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  YouTube URL
                </label>
                <input
                  type="text"
                  value={newVideo.url}
                  onChange={(e) =>
                    setNewVideo({ ...newVideo, url: e.target.value })
                  }
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full p-2 border border-gray-300 rounded-md"
                  required
                />
              </div>

              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title (optional)
                </label>
                <input
                  type="text"
                  value={newVideo.title}
                  onChange={(e) =>
                    setNewVideo({ ...newVideo, title: e.target.value })
                  }
                  placeholder="Sandstorm"
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Time (seconds)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={newVideo.startTime}
                    onChange={(e) =>
                      setNewVideo({ ...newVideo, startTime: e.target.value })
                    }
                    className="w-full p-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Time (seconds)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={newVideo.endTime}
                    onChange={(e) =>
                      setNewVideo({ ...newVideo, endTime: e.target.value })
                    }
                    className="w-full p-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
              </div>

              <div className="flex space-x-2">
                <button
                  type="submit"
                  className={`flex-1 py-2 rounded-md ${
                    isEditing
                      ? "bg-yellow-500 hover:bg-yellow-600 text-white"
                      : "bg-green-500 hover:bg-green-600 text-white"
                  }`}
                >
                  {isEditing ? "Save Changes" : "Add to Playlist"}
                </button>
                {isEditing && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 rounded-md"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>

            {/* Playlist Items */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {playlist.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No videos in playlist yet
                </p>
              ) : (
                playlist.map((video, index) => (
                  <div
                    key={video.id}
                    className={`p-3 border rounded-md ${
                      currentIndex === index && isPlaying
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-medium truncate pr-2">
                        {video.title || `Video ${index + 1}`}
                      </h3>
                      <button
                        onClick={() => handleRemoveVideo(video.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        &times;
                      </button>
                    </div>
                    <div className="text-xs text-gray-500 mb-2">
                      {new URL(video.url).hostname}
                    </div>
                    <div className="text-sm">
                      {video.startTime}s - {video.endTime}s (
                      {(video.endTime - video.startTime).toFixed(1)}s)
                    </div>
                    <div className="flex justify-between mt-2">
                      <div className="space-x-2">
                        <button
                          onClick={() => handleEditVideo(video)}
                          className="text-xs p-1 bg-yellow-100 text-yellow-700 hover:bg-yellow-200 rounded"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDuplicateVideo(video)}
                          className="text-xs p-1 bg-green-100 text-green-700 hover:bg-green-200 rounded"
                        >
                          Duplicate
                        </button>
                      </div>
                      <div className="space-x-2">
                        <button
                          onClick={() => moveUp(index)}
                          disabled={index === 0}
                          className={`text-xs p-1 rounded ${
                            index === 0
                              ? "text-gray-400"
                              : "text-blue-500 hover:bg-blue-100"
                          }`}
                        >
                          ▲ Up
                        </button>
                        <button
                          onClick={() => moveDown(index)}
                          disabled={index === playlist.length - 1}
                          className={`text-xs p-1 rounded ${
                            index === playlist.length - 1
                              ? "text-gray-400"
                              : "text-blue-500 hover:bg-blue-100"
                          }`}
                        >
                          ▼ Down
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
