/*
 * simple-comments-api
 * https://github.com/tnajdek/simple-comments-api
 *
 * Copyright (c) 2014 Tom Najdek
 * Licensed under the MIT license.
 */
'use strict';
var Parse = require('parse-api').Parse,
	all = require("promised-io/promise").all,
	ApprovedComment = Parse.Object.extend("comments_approved"),
	QueuedComment = Parse.Object.extend('comments_queued'),
	QueuedComments = Parse.Parse.Collection.extend({
		model: QueuedComment
	}),
	ExtendedComment = Parse.Object.extend('comments_extended');

module.exports.getQueuedComments = function() {
	var queued = new QueuedComments();
	return queued.fetch();
};

module.exports.approveComment = function(comment) {
	var newComment = new ApprovedComment(),
		newExtended = new ExtendedComment();

	newComment.set('name', comment.get('name'));
	newComment.set('slug', comment.get('slug'));
	newComment.set('comment', comment.get('comment'));
	newComment.set('replyTo', comment.get('replyTo'));

	newExtended.set('email', comment.get('email'));
	newExtended.set('website', comment.get('website'));

	return all(comment.delete(), newComment.save(), newExtended.save());
};

module.exports.rejectComment = function(comment) {
	return comment.delete();
};
