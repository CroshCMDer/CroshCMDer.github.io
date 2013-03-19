<?php
	$dbhost = "DATABASE_SERVER";
	$dbuser = "DATABASE_USERNAME";
	$dbpwd = "DATABASE_PASSWORD";
	$dbname = "DATABASE_NAME";
	
	//Run your password through sha1 or another hashing function to avoid storing plaintext passwords on your server
	//Resource: http://www.sha1-online.com/
	$password = "a7bc92d1dea0701b4b3362ac7a3ddabf13069b49"; //everybodyliveblog
	
	$raw_limit = 30;
	$filtered_limit = 30;
	
	session_start();
	if (empty($_SESSION['authentic']))
	{
		$_SESSION['authentic'] = false;
	}
	$dbcon = new mysqli($dbhost,$dbuser,$dbpwd,$dbname);
	if (mysqli_connect_error())
	{
		die('Connect Error (' . mysqli_connect_errno() . ') ' . mysqli_connect_error());
	}

	if (!$_SESSION['authentic'] || isset($_POST["password"]))
	{
		if (sha1($_POST['password']) == $password)
		{
			$_SESSION['authentic'] = true;
		
			$dbcon->real_query("CREATE TABLE IF NOT EXISTS liveblog_raw (id MEDIUMINT UNSIGNED NOT NULL AUTO_INCREMENT, username TINYTEXT, comment TEXT, PRIMARY KEY (id)) ENGINE=InnoDB");
			//error_log(var_dump($create_query));
		
			$preload_raw = $dbcon->prepare("SELECT id,username,comment FROM liveblog_raw ORDER BY id DESC LIMIT ?");
			$preload_raw->bind_param("i",$raw_limit);
			$preload_raw->execute();
			$preload_raw->bind_result($raw_id,$raw_username,$raw_comment);
			$raw_items = array();
			while ($preload_raw->fetch())
			{
				$raw_items[] = array(
					"id" => $raw_id,
					"username" => $raw_username,
					"comment" => $raw_comment
				);
			}
			$preload_raw->close();
		
			$dbcon->query("CREATE TABLE IF NOT EXISTS liveblog_filtered (id MEDIUMINT UNSIGNED NOT NULL AUTO_INCREMENT, username TINYTEXT, comment TEXT, raw_id MEDIUMINT, PRIMARY KEY (id)) ENGINE=InnoDB");
		
			$preload_filtered = $dbcon->prepare("SELECT id,username,comment,raw_id FROM liveblog_filtered ORDER BY id DESC LIMIT ?");
			$preload_filtered->bind_param("i",$filtered_limit);
			$preload_filtered->execute();
			$preload_filtered->bind_result($filtered_id,$filtered_username,$filtered_comment,$filtered_raw_id);
			$filtered_items = array();
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
		
			$initial_items = array(
				"filtered" => $filtered_items,
				"raw" => $raw_items
			);
		
			echo json_encode($initial_items);
		}
		else
		{
			die("invalid password");
		}
	}
	else
	{
		if (isset($_GET['raw_id']))
		{
			$statement = $dbcon->prepare("SELECT id,username,comment FROM liveblog_raw WHERE id > ? ORDER BY id DESC");
			$statement->bind_param("i",intval($_GET['raw_id']));
			$statement->execute();
			$statement->bind_result($id,$username,$comment);
			$new_items = array();
			while ($statement->fetch())
			{
				$new_items[] = array(
					"id" => $id,
					"username" => $username,
					"comment" => $comment
				);
			}
			$statement->close();
			echo json_encode($new_items);
		}
		elseif (isset($_GET['filtered_id']))
		{
			$statement = $dbcon->prepare("SELECT id,username,comment,raw_id FROM liveblog_filtered WHERE id > ? ORDER BY id DESC");
			$statement->bind_param("i",intval($_GET['filtered_id']));
			$statement->execute();
			$statement->bind_result($id,$username,$comment,$raw_id);
			$new_items = array();
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
			echo json_encode($new_items);
		}
		elseif (isset($_POST['username']))
		{
			$insert_stmt = $dbcon->prepare("INSERT INTO liveblog_filtered (username,comment,raw_id) VALUES (?,?,?)");
			$user = htmlspecialchars($_POST['username']);
			$comment = htmlspecialchars($_POST['comment']);
			$raw_id = intval($_POST['raw_id']);
			$insert_stmt->bind_param("ssi", $user, $comment, $raw_id);
			$insert_stmt->execute();
		}
		else
		{
			echo "{}";
		}
	}
?>