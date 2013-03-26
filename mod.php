<?php
	//database credentials
	$dbhost = "DATABASE_SERVER";
	$dbuser = "DATABASE_USERNAME";
	$dbpwd = "DATABASE_PASSWORD";
	$dbname = "DATABASE_NAME";
	
	//Run your password through sha1 or another hashing function to avoid storing plaintext passwords on your server
	//Resource: http://www.sha1-online.com/
	$password = "a7bc92d1dea0701b4b3362ac7a3ddabf13069b49"; //everybodyliveblog
	
	//set a limit on the number of items that will be returned on the initial load
	$raw_limit = 30;
	$filtered_limit = 30;
	
	//start a session to keep track of whether or not the user is authenticated
	session_start();
	//if there is no session variable for authentication, create one and set it to false
	if (empty($_SESSION['authentic']))
	{
		$_SESSION['authentic'] = false;
	}
	//create a new connection to the database using MySQLi
	$dbcon = new mysqli($dbhost,$dbuser,$dbpwd,$dbname);
	if (mysqli_connect_error())
	{
		die('Connect Error (' . mysqli_connect_errno() . ') ' . mysqli_connect_error());
	}

	//if the user is not authenticated OR they're submitting a password, run them through a password check
	if (!$_SESSION['authentic'] || isset($_POST["password"]))
	{
		//use a hashing function on passwords to avoid storing them as plain text
		//check if the has of the submitted password matches the hash defined above
		if (sha1($_POST['password']) == $password)
		{
			//set the session to authentic
			$_SESSION['authentic'] = true;
			
			//create the liveblog_raw table if it doesn't already exist
			$dbcon->real_query("CREATE TABLE IF NOT EXISTS liveblog_raw (id MEDIUMINT UNSIGNED NOT NULL AUTO_INCREMENT, username TINYTEXT, comment TEXT, PRIMARY KEY (id)) ENGINE=InnoDB");
			
			//create a prepared statement to retrieve the first set of items from the table
			$preload_raw = $dbcon->prepare("SELECT id,username,comment FROM liveblog_raw ORDER BY id DESC LIMIT ?");
			$preload_raw->bind_param("i",$raw_limit);
			$preload_raw->execute();
			$preload_raw->bind_result($raw_id,$raw_username,$raw_comment);
			
			//create the array that will store the returned items
			$raw_items = array();
			
			//get the data from each returnted item and add it sequentially to the array
			while ($preload_raw->fetch())
			{
				$raw_items[] = array(
					"id" => $raw_id,
					"username" => $raw_username,
					"comment" => $raw_comment
				);
			}
			$preload_raw->close();
			
			//create the liveblog_filtered table if it doesn't exist
			$dbcon->query("CREATE TABLE IF NOT EXISTS liveblog_filtered (id MEDIUMINT UNSIGNED NOT NULL AUTO_INCREMENT, username TINYTEXT, comment TEXT, raw_id MEDIUMINT, PRIMARY KEY (id)) ENGINE=InnoDB");
			
			//create a prepared statement to retrieve the first set of items from the table
			$preload_filtered = $dbcon->prepare("SELECT id,username,comment,raw_id FROM liveblog_filtered ORDER BY id DESC LIMIT ?");
			$preload_filtered->bind_param("i",$filtered_limit);
			$preload_filtered->execute();
			$preload_filtered->bind_result($filtered_id,$filtered_username,$filtered_comment,$filtered_raw_id);
			
			//create the array that will store the returned items
			$filtered_items = array();
			
			//get the data from each returnted item and add it sequentially to the array
			while ($preload_filtered->fetch())
			{
				$filtered_items[] = array(
					"id" => $filtered_id,
					"username" => $filtered_username,
					"comment" => $filtered_comment,
					"raw_id" => $filtered_raw_id
				);
			}
			$preload_filtered->close();
		
			//create an associative array to hold both sets of data
			$initial_items = array(
				"filtered" => $filtered_items,
				"raw" => $raw_items
			);
			
			//return the array to the browser as a JSON string
			echo json_encode($initial_items);
		}
		//if the password doesn't match
		else
		{
			die("invalid password");
		}
	}
	//if the user is already authenticated
	else
	{
		//if they're getting raw items
		if (isset($_GET['raw_id']))
		{
			//create a prepared statement to select the items with an ID greater than the ID from the request
			$statement = $dbcon->prepare("SELECT id,username,comment FROM liveblog_raw WHERE id > ? ORDER BY id DESC");
			$statement->bind_param("i",intval($_GET['raw_id']));
			$statement->execute();
			$statement->bind_result($id,$username,$comment);
			
			//create the array that will store the returned items
			$new_items = array();
			
			//get the data from each returnted item and add it sequentially to the array
			while ($statement->fetch())
			{
				$new_items[] = array(
					"id" => $id,
					"username" => $username,
					"comment" => $comment
				);
			}
			$statement->close();
			
			//return the array to the browser as a JSON string
			echo json_encode($new_items);
		}
		//if they're getting filtered items
		elseif (isset($_GET['filtered_id']))
		{
			//create a prepared statement to select the items with an ID greater than the ID from the request
			$statement = $dbcon->prepare("SELECT id,username,comment,raw_id FROM liveblog_filtered WHERE id > ? ORDER BY id DESC");
			$statement->bind_param("i",intval($_GET['filtered_id']));
			$statement->execute();
			$statement->bind_result($id,$username,$comment,$raw_id);
			
			//create the array that will store the returned items
			$new_items = array();
			
			//get the data from each returnted item and add it sequentially to the array
			while ($statement->fetch())
			{
				$new_items[] = array(
					"id" => $id,
					"username" => $username,
					"comment" => $comment,
					"raw_id" => $raw_id
				);
			}
			$statement->close();
			
			//return the array to the browser as a JSON string
			echo json_encode($new_items);
		}
		//if they're posting a new comment
		elseif (isset($_POST['username']))
		{
			//create a prepared statement to insert the comment directly into the filtered table
			$insert_stmt = $dbcon->prepare("INSERT INTO liveblog_filtered (username,comment,raw_id) VALUES (?,?,?)");
			//escape special characters to prevent users from submitting potentially dangerous HTML strings
			$user = htmlspecialchars($_POST['username']);
			$comment = htmlspecialchars($_POST['comment']);
			$raw_id = intval($_POST['raw_id']);
			$insert_stmt->bind_param("ssi", $user, $comment, $raw_id);
			$insert_stmt->execute();
		}
		//if none of the above are true, return an empty JSON object as a string to the browser
		//this will prevent the JavaScript update functions from throwing an error at a null value and
		//breaking the recursive cycle of update calls
		else
		{
			echo "{}";
		}
	}
?>