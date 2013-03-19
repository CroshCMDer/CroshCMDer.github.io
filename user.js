window.Liveblog = {};
Liveblog.minDelay = 1000;
Liveblog.updateWait = false;
Liveblog.delayWait = false;
Liveblog.alternate = false;
Liveblog.recaptchaKey = "your reCAPTCHA public key";

Liveblog.recaptchaSubmit = function() {
	$.ajax({
		url: "user.php",
		type: "POST",
		data: {
			"r_challenge" : Recaptcha.get_challenge(),
			"r_response" : Recaptcha.get_response()
		},
		dataType: "text",
		success: function(data) {
			if (data == "recaptcha invalid") {
				Liveblog.recaptchaFail();
			}
			else {
				$("#recaptcha-form").hide();
				$("#recaptcha-validation").hide();
				$("#recaptcha-overlay").hide();
				Recaptcha.destroy();
				Liveblog.insertData($.parseJSON(data));
				setTimeout(function() { Liveblog.update() }, Liveblog.minDelay);
			}
		}
	});
}

Liveblog.recaptchaFail = function() {
	Recaptcha.reload();
	$("#recaptcha_response_field").focus();
	$("#recaptcha-validation").show();
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

Liveblog.insertData = function(data) {
	var newData = Array.prototype.slice.call(data);
	for (var i = newData.length - 1; i >= 0; i--) {
		if ($("#liveblog-items .raw-id-" + newData[i].raw_id).length == 0 || newData[i].raw_id == 0) {
			var contentString = "<div id='";
			contentString += newData[i].id;
			contentString += "' class='liveblog-item";
			contentString += " raw-id-" + newData[i].raw_id;
			contentString += Liveblog.alternate ? " alternate" : "";
			contentString += "'><a class='liveblog-username'>";
			contentString += newData[i].username;
			contentString += "</a>: <span class='liveblog-comment'>";
			contentString += Liveblog.embedContent(newData[i].comment);
			contentString += "</span></div>";
			var scrollOffset = $("#liveblog-items").scrollTop();
			$("#liveblog-items").prepend(contentString);
			var videoWidth = $("#liveblog-items .liveblog-item:first-child").width() > 560 ? 560 : $("#liveblog-items .liveblog-item:first-child").width();
			var videoHeight = videoWidth / (16 / 9);
			$("#liveblog-items .liveblog-item:first-child iframe").css("width",videoWidth + "px").css("height",videoHeight + "px");
			$("#liveblog-items .liveblog-item:first-child img").before("<br />").after("<br />");
			if (scrollOffset) {
				var scrollDiv = document.getElementById("liveblog-items");
				var newOffset = $("#liveblog-items .liveblog-item:first-child").outerHeight();
				scrollDiv.scrollTop = newOffset + scrollOffset;
			}
			Liveblog.alternate = !Liveblog.alternate;
		}
	}
}

Liveblog.updateComplete = function(data) {
	Liveblog.insertData(data);
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
	var latest = $("div.liveblog-item:first-child").attr("id") ? $("div.liveblog-item:first-child").attr("id") : "0";
	Liveblog.updateWait = true;
	Liveblog.delayWait = Liveblog.minDelay > 0 ? true : false;
	$.ajax({
		url: "user.php",
		type: "GET",
		data: { "id" : latest },
		dataType: "json",
		success: function(data) {
			Liveblog.updateComplete(data);
		}
	});
	if (Liveblog.minDelay > 0) {
		setTimeout(function() { Liveblog.delayComplete() },Liveblog.minDelay);
	}
}

Liveblog.commentSubmit = function() {
	$.ajax({
		url: "user.php",
		type: "POST",
		data: {
			"username" : $("#username").val(),
			"comment" : $("#comment").val()
		},
		dataType: "text",
		success: function(data) {
			Liveblog.commentSuccess();
		}
	});
}

Liveblog.commentSuccess = function() {
	//show success message if desired
	$("#comment").val("").focus();
}

$(document).ready(function() {
	Recaptcha.create(Liveblog.recaptchaKey,"recaptcha-container",{ theme :"clean" , callback : function () {
		var recaptchaHeight = ($("#recaptcha-form").parent().height() - $("#recaptcha-form").outerHeight())/2;
		var recaptchaWidth = ($("#recaptcha-form").parent().width() - $("#recaptcha-form").outerWidth())/2;
		$("#recaptcha-form").css({ top : recaptchaHeight + "px" , left : recaptchaWidth + "px" });
		$("#recaptcha_response_field").focus();
	}});
	$("#liveblog-items").css("height", ($(window).height() - $("#liveblog-comment").outerHeight(true) - 22) + "px");
	$(window).resize(function() {
		$("#liveblog-items").css("height", ($(window).height() - $("#liveblog-comment").outerHeight(true) - 22) + "px");
	});
	$("body").on("click","#recaptcha-submit",function() {
		Liveblog.recaptchaSubmit();
	});
	$("body").on("keypress","#recaptcha_response_field",function(e) {
		if (e.which == 13) {
			Liveblog.recaptchaSubmit();
		}
	});
	$("body").on("click","#submit",function() {
		Liveblog.commentSubmit();
	});
	$("body").on("click",".liveblog-username",function() {
		$("#comment").val($("#comment").val() + "@" + $(this).text());
		$("#comment").focus();
	});
	$("body").on("keypress","#comment",function(e) {
		if (e.which == 13) {
			Liveblog.commentSubmit();
		}
	});
});