/*
 * simple-comments-api
 * https://github.com/tnajdek/simple-comments-api
 *
 * Copyright (c) 2014 Tom Najdek
 * Licensed under the MIT license.
 */

module.exports = function(appId, masterKey) {
	'use strict';
	var Parse = require('node-parse-api').Parse,
		all = require("promised-io/promise").all,
		Backbone = require("backbone"),
		app = new Parse(appId, masterKey),
		undefsafe = require('undefsafe'),
		Deferred = require("promised-io/promise").Deferred,
		ApprovedComment, QueuedComment, QueuedComments, ExtendedComment;
		
	Backbone.Model.prototype.isNew = function() {
		return this.get('objectId') == null;
	};

	Backbone.sync = function(method, model, options) {
		var collectionClassName = undefsafe(model, 'model.className'),
			modelClassName = undefsafe(model, 'constructor.className'),
			deferred = new Deferred();

		if(collectionClassName && method === 'read') {
			app.findMany(collectionClassName, {}, function(err, query) {
				if(err) {
					deferred.reject(err);
					options.error && options.error(err);
				} else {
					options.success && options.success(query.results);
					deferred.resolve(model);
				}
			});
		} else if(modelClassName) {
			if(method === 'create') {
				app.insert(modelClassName, model.attributes, function(err, result) {
					if(err) {
						deferred.reject(err);
						options.error && options.error(err);
					} else {
						options.success && options.success(result);
						deferred.resolve(model);
					}
				});
			} else if(method === 'delete') {
				app.delete(modelClassName, model.get('objectId'), function (err) {
					if(err) {
						deferred.reject(err);
						options.error && options.error(err);
					} else {
						options.success && options.success();
						deferred.resolve(model);
					}
				});
			}
		}

		return deferred;
	};

	ApprovedComment = Backbone.Model.extend({}, {
		className: 'comments_approved'
	}),
	QueuedComment = Backbone.Model.extend({}, {
		className: 'comments_queue'
	}),
	QueuedComments = Backbone.Collection.extend({
		model: QueuedComment
	}),
	ExtendedComment = Backbone.Model.extend({}, {
		className: 'comments_extended'
	});

	this.getQueuedComments = function() {
		var comments = new QueuedComments();
		return comments.fetch();
	};

	this.approveComment = function(comment) {
		var newComment = new ApprovedComment(),
			newExtended = new ExtendedComment(),
			deferred = new Deferred();

		newComment.set('name', comment.get('name'));
		newComment.set('slug', comment.get('slug'));
		newComment.set('comment', comment.get('comment'));
		newComment.set('replyTo', comment.get('replyTo'));

		newExtended.set('email', comment.get('email'));
		newExtended.set('website', comment.get('website'));

		all(comment.destroy(), newComment.save(), newExtended.save()).then(function() {
			deferred.resolve(newComment);
		});

		return deferred;
	};

	this.rejectComment = function(comment) {
		return comment.destroy();
	};

};