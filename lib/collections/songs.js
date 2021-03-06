Songs = new Mongo.Collection('songs');

validateSongId = function(youtubeVideoId) {
	var errors = {};
	if(!youtubeVideoId || youtubeVideoId.length !== 11) 
		errors.youtubeVideoId = "Please enter a valid youbube video id";
	return errors;
};

parseDuration = function(durationString) {
	var durationStringClone = durationString;
	var durationInSecond = 0;
	
	if (durationString.match(/\d+H/) !== null) {
		var hours = durationString.match(/\d+S/)[0].match(/\d+/)[0];
		durationInSecond += parseInt(hours) * 60 * 60;
	}
	if (durationString.match(/\d+M/) !== null) {
		var minutes = durationString.match(/\d+M/)[0].match(/\d+/)[0];
		durationInSecond += parseInt(minutes) * 60;
	}
	if (durationString.match(/\d+S/) !== null) {
		var seconds = durationString.match(/\d+S/)[0].match(/\d+/)[0];
		durationInSecond += parseInt(seconds);
	}
	
	return durationInSecond;
}

if (Meteor.isServer) {
	var GOOGLE_API_KEY = 'AIzaSyBvuD4a1hZmJgaNlzdTmokMjXNtEf2eJ3Q';

	Meteor.methods({
		songInsert: function(youtubeVideoId) {
			check(youtubeVideoId, String)
			var errors = validateSongId(youtubeVideoId);
			if (errors.youtubeVideoId)
				throw new Meteor.Error('invalid-song', errors.youtubeVideoId);

			var songWithSameYoutubeVideoId = Songs.findOne({youtubeVideoId: youtubeVideoId});
			console.log(songWithSameYoutubeVideoId);
			if (songWithSameYoutubeVideoId) 
				return {
					songExists: true,
					_id: songWithSameYoutubeVideoId._id
				}
		
			var apiUrl = 'https://www.googleapis.com/youtube/v3/videos?id='
								 + youtubeVideoId
								 + '&key='
								 + GOOGLE_API_KEY
								 +'&part=snippet,contentDetails';
			console.log(GOOGLE_API_KEY);	
			var result = Meteor.http.get(apiUrl, {timeout: 10000});
			if (result.statusCode == 200) {
				var resInJson = JSON.parse(result.content);
				var videoDetail = resInJson.items[0];
				console.log(videoDetail);
				var song = Songs.insert({
					youtubeVideoId: youtubeVideoId,
					title: videoDetail.snippet.title,
					duration: parseDuration(videoDetail.contentDetails.duration),
					votes: 0
				});
				return {
					_id: song._id
				}
			} else {
				console.log("Response issue: ", result.statusCOde);
				var errorInJson = JSON.parse(result.content);
				throw new Meteor.error(result.statusCode, erroJson.error);
			}
		}
	});	
}
Meteor.methods({
	upvote: function(songId) {
		check(songId, String);
		var song = Songs.findOne(songId);
		if (!song)
			throw new Meteor.Error('invalid', 'Song not found');

		var ip = this.connection.clientAddress;
		checkIfIpCanVote(ip, song._id, function() {
			Songs.update(song._id, {
				$inc: {votes: 1}
			});
		});

	},
	downvote: function(songId) {
		var MINIMUM_NEGATIVE_VOTES = -3;
		check(songId, String);
		var song = Songs.findOne(songId);
		if (!song)
			throw new Meteor.Error('invalid', 'Song not found');
		
		var ip = this.connection.clientAddress;
		checkIfIpCanVote(ip, song._id, function() {		
			if (song.votes - 1 <= MINIMUM_NEGATIVE_VOTES) {
				Songs.remove({_id: song._id});
			} else {
				Songs.update(song._id, {
					$inc: {votes: -1}
				});
			}
		});
	
	},
	clearVote: function(songId) {
		check(songId, String);
		var song = Songs.findOne(songId);
		if (!song)
			throw new Meteor.Error('invalid', 'Song not found');

		Songs.update(song._id, {
			$set: {votes: 0}
		});
	}
});

function checkIfIpCanVote(ip, songId, callback) {
	var currentDateTime = new Date();
	var TIME_LIMIT = 1000*10;

	if (IPs.findOne({ip: ip, song_id: songId, date: {$gte: new Date(currentDateTime.getTime() - TIME_LIMIT)}})) {
		throw new Meteor.Error(403, 'Each IP can only vote once per 10 seconds. Please try it later.');
	} else {			
		callback();
		IPs.insert({ip: ip, song_id: songId, date: currentDateTime});
	}
}
	
