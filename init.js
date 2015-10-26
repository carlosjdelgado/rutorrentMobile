/**********************************************************
 * rutorrent Mobile: A mobile rutorrent plugin
 * Author: Carlos Jimenez Delgado (mail@carlosjdelgado.com)
 * License: GNU General Public License
 **********************************************************/

plugin.enableAutodetect = true;
plugin.tabletsDetect = true;

plugin.statusFilter = {downloading: 1, completed: 2, label: 4, all: 3};
plugin.orderFilter = {date: 1, name:2, progress: 3, velocity: 4, size: 5};
plugin.criteriaFilter = {asc: 1, desc: 2};
plugin.priorities = {dont_download: 0, low: 1, normal: 2, high: 3};

plugin.torrents = null;
plugin.torrent = undefined;

plugin.currFilter = plugin.statusFilter.all;
plugin.currOrder = plugin.orderFilter.date;
plugin.currCriteria = plugin.criteriaFilter.asc;

plugin.jqueryMobile = false;

var detailsIdToLangId = {
	'status' : "Status",
	'done' : "Done",
	'downloaded' : 'Downloaded',
	'timeElapsed' : "Time_el",
	'remaining' : "Remaining",
	'ratio' : "Ratio",
	'downloadSpeed' : "Down_speed",
	'wasted' : "Wasted",
	'uploaded' : "Uploaded",
	'uploadSpeed' : "Ul_speed",
	'seeds' : "Seeds",
	'peers' : "Peers",
	'label' : 'Label',
	'priority' : 'Priority'
};

plugin.request = function(url, func) {
	theWebUI.requestWithTimeout(url, function(d){if (func != undefined) func(d);}, function(){}, function(){});
};

plugin.addTorrentByUrl = function(url) {
	try {

		$.post("php/addtorrent.php", { url: url })
		.done(function( data ) {
			console.log( "done" );
		});	
	}
	catch(err) {
	    console.log(err.message);
	}
}

plugin.order = function(order, criteria) {

	if (criteria == undefined) criteria = plugin.currCriteria;
	if (order == "") order = plugin.currOrder;

	var items = $('#list-torrents').children('li');
	
	items.sort(function(a,b){
				
		keyA = a.getAttribute("o" + order);
		keyB = b.getAttribute("o" + order);

		if (order != plugin.orderFilter.name) {
			keyA = parseFloat(keyA);
			keyB = parseFloat(keyB);
		}
		else {
			keyA = keyA.toUpperCase();
			keyB = keyB.toUpperCase();
		}
		
		if (criteria == plugin.criteriaFilter.asc) {
			if (keyA > keyB) return 1;
			if (keyA < keyB) return -1;
		}
		else {
			if (keyA < keyB) return 1;
			if (keyA > keyB) return -1;
		}
		
		return 0;
	});
	
	var ul = $('#list-torrents');
	ul.empty();
	
	$.each(items, function(i, li){
		  ul.append(li);
	});
	
	this.currOrder = order;
	this.currCriteria = criteria;
};


plugin.filter = function(f) {
	
	var downloadingDisplay = (f & this.statusFilter.downloading) != 0 ? '' : 'none';
	var completedDisplay = (f & this.statusFilter.completed) != 0 ? '' : 'none';

	$('.statusDownloading').css({display: downloadingDisplay});
	$('.statusCompleted').css({display: completedDisplay});

	this.currFilter = f;
};


plugin.setLimits = function (dl,ul) {
	theWebUI.setDLRate(dl);
	theWebUI.setULRate(ul);
}

plugin.fillDetails = function() {
	
	d = plugin.torrent;
	
	$('#torrent-name').text(d.name);

	var percent = d.done / 10.0;
	if (percent < 100) {
		classBar = 'orange';
	}
	else {
		classBar = 'green';
	}

	$('#progress-details span').attr('class', classBar);
	$('#progress-details span').css('width',percent+"%");
	$('#progress-details span span').text(percent + '%');
	
	$('#details-general-table #status td:last').text(theWebUI.getStatusIcon(d)[1]);
	$('#details-general-table #done td:last').text(percent + '%');
	$('#details-general-table #downloaded td:last').text(theConverter.bytes(d.downloaded,2));
	$('#details-general-table #timeElapsed td:last').text(theConverter.time(Math.floor((new Date().getTime()-theWebUI.deltaTime)/1000-iv(d.state_changed)),true));
	$('#details-general-table #remaining td:last').html((d.eta ==- 1) ? "&#8734;" : theConverter.time(d.eta));
	$('#details-general-table #ratio td:last').html((d.ratio ==- 1) ? "&#8734;" : theConverter.round(d.ratio/1000,3));
	$('#details-general-table #downloadSpeed td:last').text(theConverter.speed(d.dl));
	$('#details-general-table #wasted td:last').text(theConverter.bytes(d.skip_total,2));
	$('#details-general-table #uploaded td:last').text(theConverter.bytes(d.uploaded,2));
	$('#details-general-table #uploadSpeed td:last').text(theConverter.speed(d.ul));
	$('#details-general-table #seeds td:last').text(d.seeds_actual + " " + theUILang.of + " " + d.seeds_all + " " + theUILang.connected);
	$('#details-general-table #peers td:last').text(d.peers_actual + " " + theUILang.of + " " + d.peers_all + " " + theUILang.connected);

	$('#torrentPriority option').attr('selected', false);
	$('#torrentPriority option[value=' + d.priority + ']').attr('selected', true);

};

plugin.changePriority = function() {
	plugin.request('?action=dsetprio&v=' + $('#torrentPriority').val() + '&hash=' + this.torrent.hash);
};

plugin.fillTrackers = function() {
	if (this.torrent != undefined) {
		var hash = this.torrent.hash;

		var listElement = $('#details-trackers');
		listElement.empty();

		plugin.request('?action=gettrackers&hash=' + hash, function(data) {
			var trackers = data[hash];
			if (hash == mobile.torrent.hash) {
				for (var i = 0; i < trackers.length; i++) {
					
					var trackerHtml =
						'<div data-role="collapsible" data-inset="false">' +
							'<h3>' + trackers[i].name + '</h3>' +
							'<table data-role="table" id="details-general-table" data-mode="reflow" class="ui-responsive">' +
								'<thead><tr><th></th><th></th></tr></thead>' +
								'<tbody>' +
									'<tr><th>' + theUILang.Type + '</th><td>' + theFormatter.trackerType(trackers[i].type) + '</td></tr>' +
									'<tr><th>' + theUILang.Enabled + '</th><td>' + theFormatter.yesNo(trackers[i].enabled) + '</td></tr>' +
									'<tr><th>' + theUILang.Group + '</th><td>' + trackers[i].group + '</td></tr>' +
									'<tr><th>' + theUILang.Seeds + '</th><td>' + trackers[i].seeds + '</td></tr>' +
									'<tr><th>' + theUILang.Peers + '</th><td>' + trackers[i].peers + '</td></tr>' +
									'<tr><th>' + theUILang.scrapeDownloaded + '</th><td>' + trackers[i].downloaded + '</td></tr>' +
									'<tr><th>' + theUILang.scrapeUpdate + '</th><td>' +
										(trackers[i].last ? theConverter.time($.now() / 1000 - trackers[i].last - theWebUI.deltaTime / 1000, true) : '') +
										'</td></tr>' +
									'<tr><th>' + theUILang.trkInterval + '</th><td>' + theConverter.time(trackers[i].interval) + '</td></tr>' +
									'<tr><th>' + theUILang.trkPrivate + '</th><td>' + theFormatter.yesNo(theWebUI.trkIsPrivate(trackers[i].name)) + '</td></tr>' +
								'</tbody>' +
							'</table>' +
						'</div>';
					listElement.append($(trackerHtml).collapsible()).trigger('create');
				}
			}
		});
	}
};

plugin.fillFiles = function() {
	if (this.torrent != undefined) {
		
		var hash = this.torrent.hash;
		var listElement = $('#list-files');
		listElement.empty();

		plugin.request('?action=getfiles&hash=' + hash, function(data) {
			var rawFiles = data[hash];
			console.log(rawFiles);
			
			for (var i = 0; i < rawFiles.length; i++) {
				var fileHtml =
					'<li>' + rawFiles[i].name + '</li>';
				
				listElement.append(fileHtml);
			}
			listElement.listview('refresh');
		});
	}
}

plugin.isTorrentCommandEnabled = function(act,hash) {
	var ret = true;
	var status = plugin.torrents[hash].state;
	switch(act) 
	{
		case "start" : 
		{
			ret = (!(status & dStatus.started) || (status & dStatus.paused) && !(status & dStatus.checking) && !(status & dStatus.hashing));
			break;
		}
		case "pause" : 
		{
			ret = ((status & dStatus.started) && !(status & dStatus.paused) && !(status & dStatus.checking) && !(status & dStatus.hashing));
			break;
		}
		case "unpause" : 
		{
			ret = ((status & dStatus.paused) && !(status & dStatus.checking) && !(status & dStatus.hashing));
			break;
		}
		case "stop" : 
		{
			ret = ((status & dStatus.started) || (status & dStatus.hashing) || (status & dStatus.checking));
			break;
		}
		case "recheck" : 
		{
			ret = !(status & dStatus.checking) && !(status & dStatus.hashing);
			break;
		}
	}
	return(ret);
};

plugin.start = function() {
	if (this.torrent != undefined) {
		var status = this.torrent.state;

		if ((!(status & dStatus.started) || (status & dStatus.paused) && !(status & dStatus.checking) && !(status & dStatus.hashing))) {
			plugin.request('?action=start&hash=' + this.torrent.hash);
		}
	}
};

plugin.stop = function() {
	if (this.torrent != undefined) {
		var status = this.torrent.state;

		if ((status & dStatus.started) || (status & dStatus.hashing) || (status & dStatus.checking)) {
			plugin.request('?action=stop&hash=' + this.torrent.hash);
		}
	}
};

plugin.pause = function() {
	if (this.torrent != undefined) {
		var status = this.torrent.state;

		if (((status & dStatus.started) && !(status & dStatus.paused) && !(status & dStatus.checking) && !(status & dStatus.hashing))) {
			plugin.request('?action=pause&hash=' + this.torrent.hash);
		} else if (((status & dStatus.paused) && !(status & dStatus.checking) && !(status & dStatus.hashing))) {
			plugin.request('?action=unpause&hash=' + this.torrent.hash);
		}
	}
};

plugin.delete = function() {

	if (this.torrent != undefined) {
		if (theWebUI.settings["webui.confirm_when_deleting"]) {
			$('#popupDialog').popup('open');
		} else {
			this.deleteConfimed();
		}
	}
};

plugin.deleteConfimed = function() {
	this.request('?action=remove&hash=' + this.torrent.hash);
	this.torrent = undefined;
    $.mobile.pageContainer.pagecontainer("change", "#home", {
        transition: "fade"
    });
};

plugin.update = function() {
	
	theWebUI.requestWithTimeout("?list=1&getmsg=1",
		function(data) {
		
			plugin.torrents = data.torrents;
			
			var listElement = $('#list-torrents');
			listElement.empty();

			$.each(data.torrents, function(n, v){
				var status = theWebUI.getStatusIcon(v);
				var statusIcon = status[0];
				var statusClass = (v.done == 1000) ? 'Completed' : 'Downloading';
				var barColor = (statusClass=='Completed') ? 'green' : 'orange';
				var percent = v.done / 10;
				var dl = theConverter.bytes(v.dl, 2);
				var ul = theConverter.bytes(v.ul, 2);
				var eta = (v.eta < 0) ? "-" : theConverter.time(v.eta);
				var size = theConverter.bytes(v.size,2);
				v.hash = n;

				var listHtml = 
					'<li id="' + n + '" data-icon="' + statusIcon + '" data-inset="true" class="status' + statusClass + '"' +
					' o1="' + v.name + '" o2="' + v.name + '" o3="' + percent + '" o4="' + v.dl + '" o5="' + v.size + '">' +
						'<a class="listElement">' +
							v.name +
							'<div class="progress">' +
								'<span style="width: ' + percent + '%;" class="' + barColor + '">' +
									'<span>' + percent + '%</span>' +
								'</span>' +
							'</div>' +
							'<div id="list-info">' +
								'<span data-mini="true" class="ui-mini ui-btn-icon-left ui-icon-arrow-d">' + dl + '</span>' +
								'<span data-mini="true" class="ui-mini ui-btn-icon-left ui-icon-arrow-u">' + ul + '</span>' +
								'<span data-mini="true" class="ui-mini ui-btn-icon-left ui-icon-clock">' + eta + '</span>' +
							'</div>' +
						'</a>' +
					'</li>';
				listElement.append(listHtml);
			});

			plugin.filter(plugin.currFilter);
			plugin.order(plugin.currOrder, plugin.currCriteria);

			try {
				listElement.listview('refresh');
			}
			catch(err) {
			    console.log(err.message);
			}

			if (plugin.torrent != undefined) {
				if (plugin.torrents[plugin.torrent.hash] != undefined) {
					plugin.torrent = plugin.torrents[plugin.torrent.hash];
					plugin.fillDetails();

					// Disable or enable action buttons
					if (plugin.isTorrentCommandEnabled("start", plugin.torrent.hash)) {
						$('#button-start').prop('disabled', false).removeClass('ui-disabled');
					}
					else {
						$('#button-start').prop('disabled', true).addClass('ui-disabled');
					}

					if (plugin.isTorrentCommandEnabled("pause", plugin.torrent.hash) || theWebUI.isTorrentCommandEnabled("unpause", plugin.torrent.hash)) {
						$('#button-pause').prop('disabled', false).removeClass('ui-disabled');
					}
					else {
						$('#button-pause').prop('disabled', true).addClass('ui-disabled');
					}
					
					if (plugin.isTorrentCommandEnabled("remove", plugin.torrent.hash)) {
						$('#button-delete').prop('disabled', false).removeClass('ui-disabled');
					}
					else {
						$('#button-delete').prop('disabled', true).addClass('ui-disabled');
					}

					if (plugin.isTorrentCommandEnabled("stop", plugin.torrent.hash)) {
						$('#button-stop').prop('disabled', false).removeClass('ui-disabled');
					}
					else {
						$('#button-stop').prop('disabled', true).addClass('ui-disabled');
					}
				} 
			}
			
			setTimeout(function() {mobile.update();}, theWebUI.settings['webui.update_interval']);
		},

		function()
		{
			//TODO: Timeout
		},

		function(status,text)
		{
			//TODO: Error
		}
	);
};


plugin.init = function() {
	var start = (window.location.href.indexOf('mobile=1') > 0);

	if ((!start) && this.enableAutodetect) {
		start = jQuery.browser.mobile;
	}

	if (start) {
		
		this.lastHref = window.location.href;

		setInterval(function() {plugin.backListener();}, 500);

		var jQueryVer = jQuery.fn.jquery.split('.');
		if ((jQueryVer[0] == 1) && (jQueryVer[1] >= 7))
			this.jqueryMobile = true;
		else if (jQueryVer[0] > 1)
			this.jqueryMobile = true;	//For future =)


		$.ajax({
			type: 'GET',
			url: this.path + 'mobile.html',
			processData: false,

			error: function(XMLHttpRequest, textStatus, errorThrown) {
				//TODO: Error
			},

			success: function(data, textStatus) {
				$('body').html(data);

				$('link[rel=stylesheet]').remove();
				$('style').remove();
				
				plugin.loadCSS('css/jquery.mobile-1.4.3.min');
				plugin.loadCSS('css/rutorrentMobile');

				if (plugin.jqueryMobile) {
					injectScript(plugin.path+'js/jquery.mobile-1.4.3.min.js');
				}
				$('#title').text("ruTorrent v" + theWebUI.version);

				plugin.loadLang();
				plugin.fillUIControls();
				plugin.setUIEventHandlers();
				plugin.update();
			}
		});
	} else {
		this.disable();
	}
};

plugin.onLangLoaded = function() {
	
	$('#filter-type #torrentsAll').text(theUILang.All);
	$('#filter-type #torrentsDownloading').text(theUILang.Downloading);
	$('#filter-type #torrentsCompleted').text(theUILang.Finished);
	
	$('#filter-order #torrentsByDate').text(theUILang.Date);
	$('#filter-order #torrentsByName').text(theUILang.Name);
	$('#filter-order #torrentsByProgress').text(theUILang.Progress);
	$('#filter-order #torrentsByVelocity').text(theUILang.Speed);
	$('#filter-order #torrentsBySize').text(theUILang.Size);
	
	$('#filter-criteria #torrentsDesc').text(theUILang.Descending);
	$('#filter-criteria #torrentsAsc').text(theUILang.Ascending);

	$('#button-config').text(theUILang.Configuration);
	$('#button-add').text(theUILang.torrent_add);

	$('#button-menu').text(theUILang.Menu);
	$('#button-filter').text(theUILang.Filter);

	$('#settings-title').text(theUILang.Configuration);
	$('.back').text(theUILang.Back);
	$('#button-settings-ok').text(theUILang.Ok);
	
	$("label[for='select-dl-limit']").text(theUILang.DownloadLimit);
	$("label[for='select-ul-limit']").text(theUILang.UploadLimit);
	$('.no-limit').text(theUILang.unlimited);
	
	$('#addTorrent-title').text(theUILang.torrent_add);
	$("label[for='input-url-torrent']").text(theUILang.InserUrlLabel);
	$('#button-addTorrent-ok').text(theUILang.Ok);
	
	$('#details-general-table tr').each(function(n, v) {
		$(v).children('th').text(theUILang[detailsIdToLangId[v.id]]);
	});
	
	$('#button-actions').text(theUILang.Actions);
	$('#button-start').text(theUILang.Start);
	$('#button-pause').text(theUILang.Pause);
	$('#button-stop').text(theUILang.Stop);
	$('#button-delete').text(theUILang.Remove);
	
	$('#dialog-title-delete').text(theUILang.Remove);
	$('#dialog-text-delete').text(theUILang.areYouShure);
	$('.dialog-button-yes').text(theUILang.yes);
	$('.dialog-button-no').text(theUILang.no);
	
	$('#details-tab-title-general').text(theUILang.General);
	$('#details-tab-title-trackers').text(theUILang.Trackers);
	$('#details-tab-title-files').text(theUILang.Files);
	
	$('#priorityHigh').text(theUILang.High_priority);
	$('#priorityNormal').text(theUILang.Normal_priority);
	$('#priorityLow').text(theUILang.Low_priority);
	$('#priorityDont').text(theUILang.Dont_download);
};

/*
 * UI Methods
 *
 */
plugin.setUIEventHandlers = function () {

	// Ok Button for settings
	$("#button-settings-ok").click(function (e) {
	    e.stopImmediatePropagation();
	    e.preventDefault();
	    
	    var dlLimit = $('#select-dl-limit').val();
	    var ulLimit = $('#select-ul-limit').val();
	    plugin.setLimits(dlLimit, ulLimit);
	    
		$.mobile.pageContainer.pagecontainer("change", "#home", {
	        transition: "fade"
	    });
	});

	// Ok Button for add torrent file
	$("#button-addTorrent-ok").click(function (e) {
	    e.stopImmediatePropagation();
	    e.preventDefault();

	    url = $('#input-url-torrent').val();
	    plugin.addTorrentByUrl(url);
	    $('#input-url-torrent').val('');
	    
	    $.mobile.pageContainer.pagecontainer("change", "#home", {
	        transition: "fade"
	    });
	});

	// Filter change
	$("#filter-type").change(function (e) {
		type = $('#filter-type').val();
		plugin.filter(type);
	});	

	// Order change
	$("#filter-order").change(function (e) {
		order = $('#filter-order').val();
		criteria = $('#filter-criteria').val();
		plugin.order(order, criteria);
	});	

	//Order criteria change
	$("#filter-criteria").change(function (e) {
		order = $('#filter-order').val();
		criteria = $('#filter-criteria').val();
		plugin.order(order, criteria);
	});	

	// Tap on a torrent for details
	$(document).on("click", ".listElement" ,function (e) {
		target = e.target;
		while (target.tagName != 'LI') {
			target = target.parentNode;
		}
		//$("#tabs").tabs( "option", "active", 1 );
		$("#tabs").tabs({
			   selected: 1
		});
		plugin.torrent = plugin.torrents[target.id];
		plugin.torrent.hash = target.id;
		plugin.fillDetails();
		//$( "#tabs" ).tabs({ active: 1 });
		
	    $.mobile.pageContainer.pagecontainer("change", "#details", {
	        transition: "fade"
	    });
	});
	
	// Change priotity of torrent
	$('#torrentPriority').change(function(){plugin.changePriority()});
	
	// tap trackers details tab
	$(document).on("click", "#details-tab-title-trackers" ,function (e) {
		plugin.fillTrackers();
	});
	
	// tap files details tab
	$(document).on("click", "#details-tab-title-files" ,function (e) {
		plugin.fillFiles();
	});
	
	//show details page
	$(document).on('pagecontainershow', function () {
	    pageId = $('body').pagecontainer('getActivePage').prop('id'); 

	    if (pageId === 'details') {
	    	$('#details-tab-title-general').click();
	    }
	});
	
	// Action buttons
	$("#button-start").click(function (e) {
		plugin.start();
	});	

	$("#button-stop").click(function (e) {
		plugin.stop();
	});	

	$("#button-pause").click(function (e) {
		plugin.pause();
	});

	$("#button-delete").click(function (e) {
		plugin.delete();
	});

	//Torrent delete confirmation
	$("#dialog-button-confirm-delete").click(function (e) {
		plugin.deleteConfimed();
	});
	
	
};

plugin.fillUIControls = function() {

	plugin.request("?action=gettotal", function(total) {
		
		var speeds = theWebUI.settings["webui.speedlistdl"].split(",");
		for (var i = 0; i < speeds.length; i++) {
			var spd = speeds[i] * 1024;
			$('#select-dl-limit').append('<option' + (spd == total.rateDL ? ' selected' : '') + ' value="' + spd + '">' +
				theConverter.speed(spd) + '</option>');
		};

		speeds=theWebUI.settings["webui.speedlistul"].split(",");
		for (var i = 0; i < speeds.length; i++) {
			var spd = speeds[i] * 1024;

			$('#select-ul-limit').append('<option' + (spd == total.rateUL ? ' selected' : '') + ' value="' + spd + '">' +
				theConverter.speed(spd) + '</option>');
		};
	});
	
	$('#torrentPriority').html(
		'<option id="priorityHigh" value="' + plugin.priorities.high + '"></option>' +
		'<option id="priorityNormal" value="' + plugin.priorities.normal + '"></option>' +
		'<option id="priorityLow" value="' + plugin.priorities.low + '"></option>' +
		'<option id="priorityDont" value="' + plugin.priorities.dont_download + '"></option>'
	);
	
	$('#filter-type').html(
	    '<option id="torrentsAll" value="' + plugin.statusFilter.all + '"></option>' +
	    '<option id="torrentsDownloading" value="' + plugin.statusFilter.downloading + '"></option>' +
	    '<option id="torrentsCompleted" value="' + plugin.statusFilter.completed + '"></option>'
	);

	$('#filter-order').html(
	    '<option id="torrentsByDate" value="' + plugin.orderFilter.date + '"></option>' +
	    '<option id="torrentsByName" value="' + plugin.orderFilter.name + '"></option>' +
	    '<option id="torrentsByProgress" value="' + plugin.orderFilter.progress + '"></option>' +
	    '<option id="torrentsByVelocity" value="' + plugin.orderFilter.velocity + '"></option>' +
	    '<option id="torrentsBySize" value="' + plugin.orderFilter.size + '"></option>'
	);

	$('#filter-criteria').html(
		'<option id="torrentsAsc" value="' + plugin.criteriaFilter.asc + '"></option>' +
		'<option id="torrentsDesc" value="' + plugin.criteriaFilter.desc + '"></option>'
	);
};

/**
 * jQuery.browser.mobile (http://detectmobilebrowser.com/)
 * Regex updated: 1 August 2014
 *
 * jQuery.browser.mobile will be true if the browser is a mobile device
 *
 **/
(function(a){(jQuery.browser=jQuery.browser||{}).mobile=/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))})(navigator.userAgent||navigator.vendor||window.opera);
if ((plugin.tabletsDetect) && (!jQuery.browser.mobile)) {
	(function(a){jQuery.browser.mobile = /android|ipad|playbook|silk/i.test(a.substr(0,4))})(navigator.userAgent||navigator.vendor||window.opera);
}

mobile = plugin;
plugin.init();
