Template.songItem.helpers({
	displayDuration: function(second) {
		var hours,
				minutes,
				seconds,
				secondClone = parseInt(second);
				displayedDuration = '';

				console.log(second);
		hours = Math.floor(secondClone / 3600);
		minutes = Math.floor((secondClone - hours * 3600) / 60);
		seconds = Math.floor(secondClone - hours * 3600 - minutes * 60) ;

		if (hours   < 10) hours   = '0' + hours;
		if (minutes < 10) minutes = '0' + minutes;
		if (seconds < 10) seconds = '0' + seconds;

		displayedDuration = hours + ':' + minutes + ':' + seconds;
		return displayedDuration;	
			
	},
});

Template.songItem.events({
	'click .increment.up': function(e) {
		e.preventDefault();
		Meteor.call('upvote', this._id, function(err, result) {
			if (err)
				throwError(err.reason);
		});
	},
	'click .increment.down': function(e) {
		e.preventDefault();
		Meteor.call('downvote', this._id, function(err, result) {
			if (err)
				throwError(err.reason);
		});
	}
});
