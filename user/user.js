//create one object in the global namespace that will hold all data required for this application
window.Liveblog = {};
//the minimum amount of time (in milliseconds) to wait between Ajax calls
//set to 0 to make each call immediatly after the previous one finishes
Liveblog.minDelay = 1000;
//some booleans to moniter the current state
Liveblog.updateWait = false;
Liveblog.delayWait = false;
Liveblog.alternate = false;
//reCAPTCHA public key
Liveblog.recaptchaKey = "your reCAPTCHA public key";

//submit the required reCAPTCHA form
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
			//if the response was invalid
			if (data == "recaptcha invalid") {
				Liveblog.recaptchaFail();
			}
			//if the response was valid
			else {
				//hide the reCAPTCHA overlay and content
				$("#recaptcha-form").hide();
				$("#recaptcha-validation").hide();
				$("#recaptcha-overlay").hide();
				Recaptcha.destroy();
				//parse the returned data a JSON and send it to the Liveblog.insertData function
				Liveblog.insertData($.parseJSON(data));
				//wait the minimum delay, and call the update function
				setTimeout(function() { Liveblog.update() }, Liveblog.minDelay);
			}
		}
	});
}

//show reCAPTCHA validation
Liveblog.recaptchaFail = function() {
	Recaptcha.reload();
	$("#recaptcha_response_field").focus();
	$("#recaptcha-validation").show();
}


//helper function to detect embedable content and convert it to the appropriate HTML
Liveblog.embedContent = function(str) {
	//create an array of each word in the passed string
	var words = str.split(" ");
	var returnString = "";
	//interate through each item in that array
	for (var i = 0; i < words.length; i++) {
		var returnWord = "";
		//if the current word is a YouTube long URL, replace it with a YouTube embed code
		if (words[i].match(/^https?:\/\/.*\.?youtube\.com/)) {
			var vidId = words[i].replace(/.*v=([^\&]*)(.*)/, "$1");
			returnWord = "<iframe src='" + window.location.protocol + "//www.youtube.com/embed/" + vidId + "' frameborder='0' allowfullscreen></iframe>";
		}
		//if the current word is a YouTube short URL, replace it with a YouTube embed code
		else if (words[i].match(/^https?:\/\/youtu\.be/)) {
			var vidId = words[i].split("/")[3];
			returnWord = "<iframe src='" + window.location.protocol + "//www.youtube.com/embed/" + vidId + "' frameborder='0' allowfullscreen></iframe>";
		}
		//if the current word is a url that points to an image file, replace it with an <img> tag
		else if (words[i].match(/^https?:\/\/.*(\.jpg|\.jpeg|\.gif|\.png)$/)) {
			returnWord = "<img src='" + words[i] + "' style='max-width:100%' />";
		}
		//if none of the above, but still a URL, replace with a standart link set to open in a new tab
		else if (words[i].match(/^https?:\/\/[^\s]*$/)) {
			returnWord = "<a href='" + words[i] + "' target='_blank'>" + words[i] + "</a>";
		}
		//if none of the above, return the word as-is
		else {
			returnWord = words[i];
		}
		//add the current word to the result string
		returnString += returnWord;
		//if this isn't the last item in the array, add a space after it as well
		if (i != words.length) {
			returnString += " ";
		}
	}
	return returnString;
}

//inserts data returned from the server into the comments feed
Liveblog.insertData = function(data) {
	//convert the JSON data to a standard array
	var newData = Array.prototype.slice.call(data);
	//iterate through each item in the array sequentially
	for (var i = newData.length - 1; i >= 0; i--) {
		//check to see that there isn't an existing item with a matching raw id
		//this prevents duplicates in case two mods simultaneously approve the same comment
		//if the raw id is 0, then it's a mod comment, so let it through
		if ($("#liveblog-items .raw-id-" + newData[i].raw_id).length == 0 || newData[i].raw_id == 0) {
			//build the comment string
			var contentString = "<div id='";
			contentString += newData[i].id;
			contentString += "' class='liveblog-item";
			contentString += " raw-id-" + newData[i].raw_id;
			//if Liveblog.alternate is true, add the "alternate" class to the current item
			//this class is used for styling purposes
			contentString += Liveblog.alternate ? " alternate" : "";
			contentString += "'><a class='liveblog-username'>";
			contentString += newData[i].username;
			contentString += "</a>: <span class='liveblog-comment'>";
			//pass the comment text through the Liveblog.embedContent to convert content to HTML where appropriate
			contentString += Liveblog.embedContent(newData[i].comment);
			contentString += "</span></div>";
			////get the current scroll location of the container
			var scrollOffset = $("#liveblog-items").scrollTop();
			//add the current item to the top of the container
			$("#liveblog-items").prepend(contentString);
			//if the container is wider than 560px, perpare videos to be 560px wide, otherwise make them the width of their container
			var videoWidth = $("#liveblog-items .liveblog-item:first-child").width() > 560 ? 560 : $("#liveblog-items .liveblog-item:first-child").width();
			//set video height based on a 16/9 aspect ratio to the width
			var videoHeight = videoWidth / (16 / 9);
			//apply the height and width to videos
			$("#liveblog-items .liveblog-item:first-child iframe").css("width",videoWidth + "px").css("height",videoHeight + "px");
			//add a line break before and after images
			$("#liveblog-items .liveblog-item:first-child img").before("<br />").after("<br />");
			//if the container wasn't scrolled to the top
			if (scrollOffset) {
				//get the HTML element of the comments feed container
				var scrollDiv = document.getElementById("liveblog-items");
				//get the height of the newly added item
				var newOffset = $("#liveblog-items .liveblog-item:first-child").outerHeight();
				//set the new scrollTop value to the old value plus the height of the new item
				//this prevents new items from scrolling through automatically if the user is scrolled down in the list
				scrollDiv.scrollTop = newOffset + scrollOffset;
			}
			//flip the Liveblog.alternate boolean
			Liveblog.alternate = !Liveblog.alternate;
		}
	}
}

//the callback from the update Ajax call
Liveblog.updateComplete = function(data) {
	//send the data to the insert function
	Liveblog.insertData(data);
	//show that there is not a currently running update
	Liveblog.updateWait = false;
	//if the minimum delay between updates has passed, update again
	if (!Liveblog.delayWait) {
		Liveblog.update();
	}
}

//keep track of the minimum delay
Liveblog.delayComplete = function() {
	//show that the minimum delay has passed since the last update
	Liveblog.delayWait = false;
	//if there is not currently an update in progress, update again
	if (!Liveblog.updateWait) {
		Liveblog.update();
	}
}

//make the Ajax call to the server to get new items
Liveblog.update = function() {
	//get the id of the latest item
	//if there are no items, use 0 for the id
	var latest = $("div.liveblog-item:first-child").attr("id") ? $("div.liveblog-item:first-child").attr("id") : "0";
	//show that an update is in progress
	Liveblog.updateWait = true;
	//if using the time delay, show that a time delay is in progress
	Liveblog.delayWait = Liveblog.minDelay > 0 ? true : false;
	//make the call to the server
	$.ajax({
		url: "user.php",
		type: "GET",
		data: { "id" : latest },
		dataType: "json",
		success: function(data) {
			//send the response data to Liveblog.updateComplete
			Liveblog.updateComplete(data);
		}
	});
	//if using the time delay, wait the minimum amount of time and call the Liveblog.delayComplete function
	if (Liveblog.minDelay > 0) {
		setTimeout(function() { Liveblog.delayComplete() },Liveblog.minDelay);
	}
}

//submit a comment
Liveblog.commentSubmit = function() {
	$.ajax({
		url: "user.php",
		type: "POST",
		//get username and comment from appropriate inputs
		data: {
			"username" : $("#username").val(),
			"comment" : $("#comment").val()
		},
		dataType: "text",
		success: function(data) {
			//success callback
			Liveblog.commentSuccess();
		}
	});
}

Liveblog.commentSuccess = function() {
	//clear the comment textarea and give it focues
	$("#comment").val("").focus();
}

//these run once the DOM is loaded
$(document).ready(function() {
	//create the reCAPTCHA
	//as its callback function, position it in the middle of the screen
	Recaptcha.create(Liveblog.recaptchaKey,"recaptcha-container",{ theme :"clean" , callback : function () {
		var recaptchaHeight = ($("#recaptcha-form").parent().height() - $("#recaptcha-form").outerHeight())/2;
		var recaptchaWidth = ($("#recaptcha-form").parent().width() - $("#recaptcha-form").outerWidth())/2;
		$("#recaptcha-form").css({ top : recaptchaHeight + "px" , left : recaptchaWidth + "px" });
		$("#recaptcha_response_field").focus();
	}});
	//size the comment feed container
	$("#liveblog-items").css("height", ($(window).height() - $("#liveblog-comment").outerHeight(true) - 22) + "px");
	//resize the comment feed container whenever the window is resized
	$(window).resize(function() {
		$("#liveblog-items").css("height", ($(window).height() - $("#liveblog-comment").outerHeight(true) - 22) + "px");
	});
	//submit the reCAPTCHA when the reCAPTCHA submit button is clicked or when the "enter" button is pressed from the reCAPTCHA input
	$("body").on("click","#recaptcha-submit",function() {
		Liveblog.recaptchaSubmit();
	});
	$("body").on("keypress","#recaptcha_response_field",function(e) {
		if (e.which == 13) {
			Liveblog.recaptchaSubmit();
		}
	});
	//submit a comment when the submit button is clicked or "enter" is pressed in the comment textarea
	$("body").on("click","#submit",function() {
		Liveblog.commentSubmit();
	});
	$("body").on("keypress","#comment",function(e) {
		if (e.which == 13) {
			Liveblog.commentSubmit();
		}
	});
	//if the user clicks on a username, add @username to the comment textarea
	$("body").on("click",".liveblog-username",function() {
		$("#comment").val($("#comment").val() + "@" + $(this).text());
		$("#comment").focus();
	});
});