window.Liveblog = {};
//the minimum amount of time (in milliseconds) to wait between Ajax calls
//set to 0 to make each call immediatly after the previous one finishes
Liveblog.minDelay = 500;
//some booleans to moniter the current state
Liveblog.updateWait = false;
Liveblog.delayWait = false;
Liveblog.alternate = false;
Liveblog.getFiltered = false;

//simple login function
Liveblog.loginSubmit = function() {
	$.ajax({
		url: "mod.php",
		type: "POST",
		data: { "password" : $("#password").val() },
		dataType: "text",
		success: function(data) {
			//if login fails
			if (data == "invalid password") {
				Liveblog.loginFail();
			}
			//if login succeeds
			else {
				//hide the password overlay and content
				$("#password-form").hide();
				$("#password-validation").hide();
				$("#password-overlay").hide();
				//parse the returned data as JSON, which will have two properties, "raw" and "filtered"
				//insert each data set
				Liveblog.insertData($.parseJSON(data)["raw"],false);
				Liveblog.insertData($.parseJSON(data)["filtered"],true);
				//wait the minimum delay, and call the update function
				setTimeout(function() { Liveblog.update() }, Liveblog.minDelay);
			}
		}
	});
}

//show password validation
Liveblog.loginFail = function() {
	$("#password").val("");
	$("#password").focus();
	$("#password-validation").show();
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

//inserts data returned from the server into the appropriate locaiton
//argument "data" is a JSON object of the data to be inserted
//argument "filtered" is a boolean to determine whether the data should be inserted into the filtered feed or the raw feed
Liveblog.insertData = function(data,filtered) {
	//determine the desination container
	var itemsContainer = filtered ? $("#liveblog-filtered-items") : $("#liveblog-raw-items");
	//convert the JSON data to a standard array
	var newData = Array.prototype.slice.call(data);
	//iterate through each item in the array sequentially
	for (var i = newData.length - 1; i >= 0; i--) {
		//if this is the filtered feed, ensure that no item was accidently approved by two moderaters simultaneously
		if ((filtered && ($("#liveblog-filtered-items .raw-id-" + newData[i].raw_id).length == 0 || newData[i].raw_id == 0)) || !filtered) {
			//start building the return string
			var contentString = "<div id='";
			contentString += newData[i].id;
			contentString += "' class='liveblog-item-container";
			//if it's the filtered feed, add the item's raw ID as a class
			contentString += filtered ? " raw-id-" + newData[i].raw_id : "";
			//Liveblog.alternate tracks whether or not to apply the "alternate" class to filtered feed items
			//this class is used for styling purposes
			contentString += filtered && Liveblog.alternate ? " alternate" : "";
			contentString += "'><div class='liveblog-item'><a class='liveblog-username'>";
			contentString += newData[i].username;
			contentString += "</a>: <span class='liveblog-comment'>";
			//send the comment through the Liveblog.embedContent function to create HTML where applicable
			contentString += Liveblog.embedContent(newData[i].comment);
			contentString += "</span>";
			//the approve/edit buttons appended to raw feed items
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
			//add the above buttons if in the raw feed
			contentString += !filtered ? rawButtons : "";
			contentString += "</div>";
			//if the raw feed, add the comment text (unembeded) in a hidden div so it can be edited
			var additionalRaw = "<div class='liveblog-item-editor'><textarea rows='5' cols='50'></textarea><br /><input type='button' value='Save' class='liveblog-edit-save' /> <input type='button' value='Cancel' class='liveblog-edit-cancel' /></div><div class='liveblog-item-plain'>" + newData[i].comment + "</div>";
			contentString += !filtered ? additionalRaw : "";
			contentString += "</div>";
			//get the current scroll location of the container
			var scrollOffset = itemsContainer.scrollTop();
			//add the current item to the top of the container
			itemsContainer.prepend(contentString);
			//if the container is wider than 560px, perpare videos to be 560px wide, otherwise make them the width of their container
			var videoWidth = itemsContainer.find(".liveblog-item-container:first-child").width() > 560 ? 560 : itemsContainer.find(".liveblog-item-container:first-child").width();
			//set video height based on a 16/9 aspect ratio to the width
			var videoHeight = videoWidth / (16 / 9);
			//apply the height and width to videos
			itemsContainer.find(".liveblog-item-container:first-child iframe").css("width",videoWidth + "px").css("height",videoHeight + "px");
			//add a line break before and after images
			itemsContainer.find(".liveblog-item-container:first-child .liveblog-comment img").before("<br />").after("<br />");
			//if the container wasn't scrolled to the top
			if (scrollOffset) {
				//get the HTML Element object out of the jQuery object
				var scrollDiv = itemsContainer[0];
				//get the height of the newly added item
				var newOffset = itemsContainer.children(".liveblog-item-container:first-child").outerHeight();
				//set the new scrollTop value to the old value plus the height of the new item
				//this prevents new items from scrolling through automatically if the user is scrolled down in the list
				scrollDiv.scrollTop = scrollOffset + newOffset;
			}
			if (!filtered) {
				//add the un-embeded comment text to the raw textarea so it can be edited
				itemsContainer.find(".liveblog-item-container:first-child textarea").val(itemsContainer.find(".liveblog-item-container:first-child .liveblog-item-plain").text());
			}
			if (filtered) {
				//if an items has been approved, remove it from the raw feed so it can't be approved again
				$("#liveblog-raw-items #" + newData[i].raw_id).hide();
			}
			//flip the Liveblog.alternate boolean
			Liveblog.alternate = filtered ? !Liveblog.alternate : Liveblog.alternate;
		}
	}
	if (!filtered) {
		//remove and reassign the alternate class to the raw items
		//the dynamic nature of this feed makes simple static alternating impossible
		$("#liveblog-raw-items .liveblog-item-container").removeClass("alternate");
		$("#liveblog-raw-items .liveblog-item-container:visible:odd").addClass("alternate");
	}
}

//the callback from the update Ajax call
Liveblog.updateComplete = function(data,filtered) {
	//send the data to the insert function
	Liveblog.insertData(data,filtered);
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
	//determine which feed to pull from
	var typeId = Liveblog.getFiltered ? "filtered_id" : "raw_id";
	//get the id of the latest item for the appropriate feed
	//if no items exist yet, use 0 for the id
	var latest = Liveblog.getFiltered ? 
		($("div#liveblog-filtered-items .liveblog-item-container:first-child").attr("id") ? $("div#liveblog-filtered-items .liveblog-item-container:first-child").attr("id") : "0") :
		($("div#liveblog-raw-items .liveblog-item-container:first-child").attr("id") ? $("div#liveblog-raw-items .liveblog-item-container:first-child").attr("id") : "0");
	var dataObject = {};
	dataObject[typeId] = latest;
	//show that an update is in progress
	Liveblog.updateWait = true;
	//if using the time delay, show that a time delay is in progress
	Liveblog.delayWait = Liveblog.minDelay > 0 ? true : false;
	//make the call to the server
	$.ajax({
		url: "mod.php",
		type: "GET",
		data: dataObject,
		dataType: "json",
		success: function(data) {
			//send the response data to Liveblog.updateComplete
			Liveblog.updateComplete(data,Liveblog.getFiltered);
			//flip whether Liveblog.getFiltered so the next update will pull from the other feed
			Liveblog.getFiltered = !Liveblog.getFiltered;
		}
	});
	//if using the time delay, wait the minimum amount of time and call the Liveblog.delayComplete function
	if (Liveblog.minDelay > 0) {
		setTimeout(function() { Liveblog.delayComplete() },Liveblog.minDelay);
	}
}

//submit a comment
//argument "own" is a boolean that is true if this is a mod's own comment, false if it is an approved user comment
//argument "elem" is an HTML element that is the approved user comment if "own" is false
Liveblog.commentSubmit = function(own,elem) {
	//get the username and comment text from the appropriate source
	var username = own ? $("#username").val() : $(elem).parents(".liveblog-item").children(".liveblog-username").text();
	var comment = own ? $("#comment").val() : $(elem).parents(".liveblog-item-container").children(".liveblog-item-plain").text();
	//if own comment, raw_id is set to 0, otherwise it is the ID of the user comment that was approved
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
				//call the successful comment funtion
				Liveblog.commentSuccess();
			}
		}
	});
}


Liveblog.commentSuccess = function() {
	//clear the comment box and give it focus
	$("#comment").val("").focus();
}

//these run once the DOM is loaded
$(document).ready(function() {
	//give the password textbox focus so user can type immediatly
	$("#password").focus();
	//send the password verification when the button is clicked or "enter" is pressed
	$("body").on("click","#password-submit",function() {
		Liveblog.loginSubmit();
	});
	$("body").on("keypress","#password",function(e) {
		if (e.which == 13) {
			Liveblog.loginSubmit();
		}
	});
	//set the height of the scrolling comment boxes
	$("#liveblog-filtered-items").css("height", ($(window).height() - $("#liveblog-comment").outerHeight(true) - 22) + "px");
	$("#liveblog-raw-items").css("height", ($(window).height() - 42) + "px");
	//reset their height whenever the window is resized
	$(window).resize(function() {
		$("#liveblog-filtered-items").css("height", ($(window).height() - $("#liveblog-comment").outerHeight(true) - 22) + "px");
		$("#liveblog-raw-items").css("height", ($(window).height() - 42) + "px");
	});
	//adjust the appearance and location of the password box
	var passwordHeight = ($("#password-form").parent().height() - $("#password-form").outerHeight())/2;
	var passwordWidth = ($("#password-form").parent().width() - $("#password-form").outerWidth())/2;
	$("#password-form").css({ top : passwordHeight + "px" , left : passwordWidth + "px" });
	//when the "approve" button on a raw item is clicked, approve it
	//a persistent event handler is requeried here since the content will change after page load
	$("body").on("click","#liveblog-raw-items .liveblog-approve-button",function() {
		Liveblog.commentSubmit(false,this);
		$(this).parents(".liveblog-item-container").hide();
		$("#liveblog-raw-items .liveblog-item-container").removeClass("alternate");
		$("#liveblog-raw-items .liveblog-item-container:visible:odd").addClass("alternate");
	});
	//toggle the visibility of the edit textarea when the edit button is clicked
	//a persistent event handler is requeried here since the content will change after page load
	$("body").on("click","#liveblog-raw-items .liveblog-edit-button",function() {
		$(this).parents(".liveblog-item").next().slideToggle();
		$(this).parent().prev().children("span").toggleClass("liveblog-approve-button");
	});
	//submit the comment from the comment box when the submit button is clicked
	$("body").on("click","#submit",function() {
		Liveblog.commentSubmit(true);
	});
	//if a raw item's contents are edited, and then the save button is clicked
	//run the content through the Liveblog.embedContent function
	//replace the old content with the updated content
	//adjust embeded content's height and width accordingly
	//a persistent event handler is requeried here since the content will change after page load
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
	//if the cancel button is clicked when an item is being edited, discard changes and hide the edit textarea
	//a persistent event handler is requeried here since the content will change after page load
	$("body").on("click",".liveblog-item-editor .liveblog-edit-cancel",function() {
		$(this).parent().slideUp(400,function() {
			$(this).children("textarea").val($(this).next().text());
		});
		$(this).parents(".liveblog-item-container").find(".liveblog-item-approve span").addClass("liveblog-approve-button");
	});
	//if the user clicks on a username, add @username to the comment textarea
	$("body").on("click","#liveblog-filtered-items .liveblog-username",function() {
		$("#comment").val($("#comment").val() + "@" + $(this).text());
		$("#comment").focus();
	});
	//if the user presses "enter" in the comment textarea, submit the comment.
	$("body").on("keypress","#comment",function(e) {
		if (e.which == 13) {
			Liveblog.commentSubmit(true);
		}
	});
});