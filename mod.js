window.Liveblog = {};
Liveblog.minDelay = 500;
Liveblog.updateWait = false;
Liveblog.delayWait = false;
Liveblog.alternate = false;
Liveblog.getFiltered = false;

Liveblog.loginSubmit = function() {
	$.ajax({
		url: "mod.php",
		type: "POST",
		data: { "password" : $("#password").val() },
		dataType: "text",
		success: function(data) {
			if (data == "invalid password") {
				Liveblog.loginFail();
			}
			else {
				$("#password-form").hide();
				$("#password-validation").hide();
				$("#password-overlay").hide();
				Liveblog.insertData($.parseJSON(data)["raw"],false);
				Liveblog.insertData($.parseJSON(data)["filtered"],true);
				setTimeout(function() { Liveblog.update() }, Liveblog.minDelay);
			}
		}
	});
}

Liveblog.loginFail = function() {
	$("#password").val("");
	$("#password").focus();
	$("#password-validation").show();
}

Liveblog.embedContent = function(str) {
	var words = str.split(" ");
	var returnString = "";
	for (var i = 0; i < words.length; i++) {
		var returnWord = "";
		if (words[i].match(/^https?:\/\/.*\.?youtube\.com/)) {
			var vidId = words[i].replace(/.*v=([^\&]*)(.*)/, "$1");
			returnWord = "<iframe src='" + window.location.protocol + "//www.youtube.com/embed/" + vidId + "' frameborder='0' allowfullscreen></iframe>";
		}
		else if (words[i].match(/^https?:\/\/youtu\.be/)) {
			var vidId = words[i].split("/")[3];
			returnWord = "<iframe src='" + window.location.protocol + "//www.youtube.com/embed/" + vidId + "' frameborder='0' allowfullscreen></iframe>";
		}
		else if (words[i].match(/^https?:\/\/.*(\.jpg|\.jpeg|\.gif|\.png)$/)) {
			returnWord = "<img src='" + words[i] + "' style='max-width:100%' />";
		}
		else if (words[i].match(/^https?:\/\/[^\s]*$/)) {
			returnWord = "<a href='" + words[i] + "'>" + words[i] + "</a>";
		}
		else {
			returnWord = words[i];
		}
		returnString += returnWord;
		if (i != words.length) {
			returnString += " ";
		}
	}
	return returnString;
}

Liveblog.insertData = function(data,filtered) {
	var itemsContainer = filtered ? $("#liveblog-filtered-items") : $("#liveblog-raw-items");
	var newData = Array.prototype.slice.call(data);
	for (var i = newData.length - 1; i >= 0; i--) {
		if ((filtered && ($("#liveblog-filtered-items .raw-id-" + newData[i].raw_id).length == 0 || newData[i].raw_id == 0)) || !filtered) {
			var contentString = "<div id='";
			contentString += newData[i].id;
			contentString += "' class='liveblog-item-container";
			contentString += filtered ? " raw-id-" + newData[i].raw_id : "";
			contentString += filtered && Liveblog.alternate ? " alternate" : "";
			contentString += "'><div class='liveblog-item'><a class='liveblog-username'>";
			contentString += newData[i].username;
			contentString += "</a>: <span class='liveblog-comment'>";
			contentString += Liveblog.embedContent(newData[i].comment);
			contentString += "</span>";
			var rawButtons = "<div class='liveblog-item-buttons'>" +
								"<table>" +
									"<tbody>" +
										"<tr>" +
											"<td class='liveblog-item-approve'>" +
												"<span class='liveblog-approve-button'>" +
													"<img src='images/approve-icon-32.png' height='32' /> Approve" +
												"</span>" +
											"</td>" +
											"<td class='liveblog-item-edit'>" +
												"<span class='liveblog-edit-button'>" +
													"<img src='images/edit-icon-32.png' height='32' /> Edit" +
												"</span>" +
											"</td>" +
										"</tr>" +
									"</tbody>" +
								"</table>" +
							"</div>";
			contentString += !filtered ? rawButtons : "";
			contentString += "</div>";
			var additionalRaw = "<div class='liveblog-item-editor'><textarea rows='5' cols='50'></textarea><br /><input type='button' value='Save' class='liveblog-edit-save' /> <input type='button' value='Cancel' class='liveblog-edit-cancel' /></div><div class='liveblog-item-plain'>" + newData[i].comment + "</div>";
			contentString += !filtered ? additionalRaw : "";
			contentString += "</div>";
			var scrollOffset = itemsContainer.scrollTop();
			itemsContainer.prepend(contentString);
			var videoWidth = itemsContainer.find(".liveblog-item-container:first-child").width() > 560 ? 560 : itemsContainer.find(".liveblog-item-container:first-child").width();
			var videoHeight = videoWidth / (16 / 9);
			itemsContainer.find(".liveblog-item-container:first-child iframe").css("width",videoWidth + "px").css("height",videoHeight + "px");
			itemsContainer.find(".liveblog-item-container:first-child .liveblog-comment img").before("<br />").after("<br />");
			if (scrollOffset) {
				var scrollDiv = itemsContainer[0];
				var newOffset = itemsContainer.children(".liveblog-item-container:first-child").outerHeight();
				scrollDiv.scrollTop = scrollOffset + newOffset;
			}
			if (!filtered) {
				itemsContainer.find(".liveblog-item-container:first-child textarea").val(itemsContainer.find(".liveblog-item-container:first-child .liveblog-item-plain").text());
			}
			if (filtered) {
				$("#liveblog-raw-items #" + newData[i].raw_id).hide();
			}
			Liveblog.alternate = filtered ? !Liveblog.alternate : Liveblog.alternate;
		}
	}
	if (!filtered) {
		$("#liveblog-raw-items .liveblog-item-container").removeClass("alternate");
		$("#liveblog-raw-items .liveblog-item-container:visible:odd").addClass("alternate");
	}
}

Liveblog.updateComplete = function(data,filtered) {
	Liveblog.insertData(data,filtered);
	Liveblog.updateWait = false;
	if (!Liveblog.delayWait) {
		Liveblog.update();
	}
}

Liveblog.delayComplete = function() {
	Liveblog.delayWait = false;
	if (!Liveblog.updateWait) {
		Liveblog.update();
	}
}

Liveblog.update = function() {
	var typeId = Liveblog.getFiltered ? "filtered_id" : "raw_id";
	var latest = Liveblog.getFiltered ? 
		($("div#liveblog-filtered-items .liveblog-item-container:first-child").attr("id") ? $("div#liveblog-filtered-items .liveblog-item-container:first-child").attr("id") : "0") :
		($("div#liveblog-raw-items .liveblog-item-container:first-child").attr("id") ? $("div#liveblog-raw-items .liveblog-item-container:first-child").attr("id") : "0");
	var dataObject = {};
	dataObject[typeId] = latest;
	Liveblog.updateWait = true;
	Liveblog.delayWait = Liveblog.minDelay > 0 ? true : false;
	$.ajax({
		url: "mod.php",
		type: "GET",
		data: dataObject,
		dataType: "json",
		success: function(data) {
			Liveblog.updateComplete(data,Liveblog.getFiltered);
			Liveblog.getFiltered = !Liveblog.getFiltered;
		}
	});
	if (Liveblog.minDelay > 0) {
		setTimeout(function() { Liveblog.delayComplete() },Liveblog.minDelay);
	}
}

Liveblog.commentSubmit = function(own,elem) {
	var username = own ? $("#username").val() : $(elem).parents(".liveblog-item").children(".liveblog-username").text();
	var comment = own ? $("#comment").val() : $(elem).parents(".liveblog-item-container").children(".liveblog-item-plain").text();
	var raw_id = own ? "0" : $(elem).parents(".liveblog-item-container").attr("id");
	$.ajax({
		url: "mod.php",
		type: "POST",
		data: {
			"username" : username,
			"comment" : comment,
			"raw_id" : raw_id
		},
		dataType: "text",
		success: function(data) {
			if (own) {
				Liveblog.commentSuccess();
			}
		}
	});
}

Liveblog.commentSuccess = function() {
	//show success message if desired
	$("#comment").val("").focus();
}

$(document).ready(function() {
	$("#password").focus();
	$("body").on("click","#password-submit",function() {
		Liveblog.loginSubmit();
	});
	$("body").on("keypress","#password",function(e) {
		if (e.which == 13) {
			Liveblog.loginSubmit();
		}
	});
	$("#liveblog-filtered-items").css("height", ($(window).height() - $("#liveblog-comment").outerHeight(true) - 22) + "px");
	$("#liveblog-raw-items").css("height", ($(window).height() - 42) + "px");
	$(window).resize(function() {
		$("#liveblog-filtered-items").css("height", ($(window).height() - $("#liveblog-comment").outerHeight(true) - 22) + "px");
		$("#liveblog-raw-items").css("height", ($(window).height() - 42) + "px");
	});
	var passwordHeight = ($("#password-form").parent().height() - $("#password-form").outerHeight())/2;
	var passwordWidth = ($("#password-form").parent().width() - $("#password-form").outerWidth())/2;
	$("#password-form").css({ top : passwordHeight + "px" , left : passwordWidth + "px" });
	$("body").on("click","#liveblog-raw-items .liveblog-approve-button",function() {
		Liveblog.commentSubmit(false,this);
		$(this).parents(".liveblog-item-container").hide();
		$("#liveblog-raw-items .liveblog-item-container").removeClass("alternate");
		$("#liveblog-raw-items .liveblog-item-container:visible:odd").addClass("alternate");
	});
	$("body").on("click","#liveblog-raw-items .liveblog-edit-button",function() {
		$(this).parents(".liveblog-item").next().slideToggle();
		$(this).parent().prev().children("span").toggleClass("liveblog-approve-button");
	});
	$("body").on("click","#submit",function() {
		Liveblog.commentSubmit(true);
	});
	$("body").on("click",".liveblog-item-editor .liveblog-edit-save",function() {
		$(this).parent().slideUp();
		$(this).parents(".liveblog-item-container").find(".liveblog-item-approve span").addClass("liveblog-approve-button");
		var newVal = $(this).parent().children("textarea").val();
		$(this).parent().next().text(newVal);
		$(this).parent().prev().children(".liveblog-comment").html(Liveblog.embedContent(newVal));
		var videoWidth = $(this).parents(".liveblog-item-container").width() > 560 ? 560 : $(this).parents(".liveblog-item-container").width();
		var videoHeight = videoWidth / (16 / 9);
		$(this).parents(".liveblog-item-container").find("iframe").css("width",videoWidth + "px").css("height",videoHeight + "px");
		$(this).parents(".liveblog-item-container").find(".liveblog-comment img").before("<br />").after("<br />");
	});
	$("body").on("click",".liveblog-item-editor .liveblog-edit-cancel",function() {
		$(this).parent().slideUp(400,function() {
			$(this).children("textarea").val($(this).next().text());
		});
		$(this).parents(".liveblog-item-container").find(".liveblog-item-approve span").addClass("liveblog-approve-button");
	});
	$("body").on("click","#liveblog-filtered-items .liveblog-username",function() {
		$("#comment").val($("#comment").val() + "@" + $(this).text());
		$("#comment").focus();
	});
	$("body").on("keypress","#comment",function(e) {
		if (e.which == 13) {
			Liveblog.commentSubmit(true);
		}
	});
});