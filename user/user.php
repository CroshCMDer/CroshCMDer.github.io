<?php
	//database credentials
	$dbhost = "DATABASE_SERVER";
	$dbuser = "DATABASE_USERNAME";
	$dbpwd = "DATABASE_PASSWORD";
	$dbname = "DATABASE_NAME";
	
	//I strongly recommend using a captcha with this app due to the sheer load it could place on a database
	//Resource: http://www.google.com/recaptcha
	$recaptcha_private_key = "YOUR_RECAPTCHA_PRIVATE_KEY";
	
	/set a limit on the number of items that will be returned on the initial load
	$preload_limit = 30;
	
	//start a session to keep track of whether or not the user is authenticated
	session_start();
	//if there is no session variable for authentication, create one and set it to false
	if (empty($_SESSION['human']))
	{
		$_SESSION['human'] = false;
	}
	//create a new connection to the database using MySQLi
	$dbcon = new mysqli($dbhost,$dbuser,$dbpwd,$dbname);
	if (mysqli_connect_error())
	{
		die('Connect Error (' . mysqli_connect_errno() . ') ' . mysqli_connect_error());
	}
	
	//if the user is not authenticated OR they're submitting a reCAPTCHA
	if (!$_SESSION['human'] || isset($_POST["r_challenge"]))
	{
		//if they're submitting a reCAPTCHA, run them through a reCAPTCHA check
		if (isset($_POST['r_challenge']))
		{
			//check the reCAPTCHA
			require_once('recaptchalib.php');
			$resp = recaptcha_check_answer(
				$recaptcha_private_key,
				$_SERVER["REMOTE_ADDR"],
				$_POST["r_challenge"],
				$_POST["r_response"]
			);
			//if it's wrong, boot them out
			if (!$resp->is_valid)
			{
				die("recaptcha invalid");
			}
			//if it's correct
			else
			{
				//set the session to authentic
				$_SESSION['human'] = true;
				
				//create both tables if they don't already exist
				$dbcon->query("CREATE TABLE IF NOT EXISTS liveblog_filtered (id MEDIUMINT UNSIGNED NOT NULL AUTO_INCREMENT, username TINYTEXT, comment TEXT, raw_id MEDIUMINT, PRIMARY KEY (id)) ENGINE=InnoDB");
				$dbcon->query("CREATE TABLE IF NOT EXISTS liveblog_raw (id MEDIUMINT UNSIGNED NOT NULL AUTO_INCREMENT, username TINYTEXT, comment TEXT, PRIMARY KEY (id)) ENGINE=InnoDB");
				
				//create a prepared statement to retrieve the first set of items from the table
				$preload = $dbcon->prepare("SELECT id,username,comment,raw_id FROM liveblog_filtered ORDER BY id DESC LIMIT ?");
				$preload->bind_param("i",$preload_limit);
				$preload->execute();
				$preload->bind_result($id,$username,$comment,$raw_id);
				
				//create the array that will store the returned items
				$initial_items = array();
				
				//get the data from each returnted item and add it sequentially to the array
				while ($preload->fetch())
				{
					$initial_items[] = array(
						"id" => $id,
						"username" => $username,
						"comment" => $comment,
						"raw_id" => $raw_id
					);
				}
				$preload->close();
				
				//return the array to the browser as a JSON string
				echo json_encode($initial_items);
			}
		}
		//if not authenticated and not submitting a reCAPTCA, boot them out
		else
		{
			die("not authenticated");
		}
	}
	//if already authenticated
	else
	{
		//if its an update request
		if (isset($_GET['id']))
		{
			////create a prepared statement to select the items with an ID greater than the ID from the request
			$statement = $dbcon->prepare("SELECT id,username,comment,raw_id FROM liveblog_filtered WHERE id > ? ORDER BY id DESC");
			$statement->bind_param("i",intval($_GET['id']));
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
		//if it's a new comment
		elseif (isset($_POST['username']))
		{
			//create a prepared statement to insert the comment into the raw table
			$insert_stmt = $dbcon->prepare("INSERT INTO liveblog_raw (username,comment) VALUES (?,?)");
			//escape special characters to prevent users from submitting potentially dangerous HTML strings
			$user = htmlspecialchars($_POST['username']);
			$comment = htmlspecialchars($_POST['comment']);
			$insert_stmt->bind_param("ss", $user, $comment);
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