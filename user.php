<?php
	$dbhost = "DATABASE_SERVER";
	$dbuser = "DATABASE_USERNAME";
	$dbpwd = "DATABASE_PASSWORD";
	$dbname = "DATABASE_NAME";
	
	//I stronly reccomend using a captcha with this app due to the sheet load it could place on a database
	//Resource: http://www.google.com/recaptcha
	$recaptcha_private_key = "YOUR_RECAPTCHA_PRIVATE_KEY";
	
	$preload_limit = 30;
	
	session_start();
	if (empty($_SESSION['human']))
	{
		$_SESSION['human'] = false;
	}
	
	$dbcon = new mysqli($dbhost,$dbuser,$dbpwd,$dbname);
	if (mysqli_connect_error())
	{
		die('Connect Error (' . mysqli_connect_errno() . ') ' . mysqli_connect_error());
	}
	
	if (!$_SESSION['human'] || isset($_POST["r_challenge"]))
	{
		if (isset($_POST['r_challenge']))
		{
			require_once('recaptchalib.php');
			$resp = recaptcha_check_answer(
				$recaptcha_private_key,
				$_SERVER["REMOTE_ADDR"],
				$_POST["r_challenge"],
				$_POST["r_response"]
			);
			if (!$resp->is_valid)
			{
				die("recaptcha invalid");
			}
			else
			{
				$_SESSION['human'] = true;
				
				$dbcon->query("CREATE TABLE IF NOT EXISTS liveblog_filtered (id MEDIUMINT UNSIGNED NOT NULL AUTO_INCREMENT, username TINYTEXT, comment TEXT, raw_id MEDIUMINT, PRIMARY KEY (id)) ENGINE=InnoDB");
				$dbcon->query("CREATE TABLE IF NOT EXISTS liveblog_raw (id MEDIUMINT UNSIGNED NOT NULL AUTO_INCREMENT, username TINYTEXT, comment TEXT, PRIMARY KEY (id)) ENGINE=InnoDB");
				
				$preload = $dbcon->prepare("SELECT id,username,comment,raw_id FROM liveblog_filtered ORDER BY id DESC LIMIT ?");
				$preload->bind_param("i",$preload_limit);
				$preload->execute();
				$preload->bind_result($id,$username,$comment,$raw_id);
				$initial_items = array();
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
				echo json_encode($initial_items);
			}
		}
		else
		{
			die("not authenticated");
		}
	}
	else
	{
		if (isset($_GET['id']))
		{
			$statement = $dbcon->prepare("SELECT id,username,comment,raw_id FROM liveblog_filtered WHERE id > ? ORDER BY id DESC");
			$statement->bind_param("i",intval($_GET['id']));
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
			$insert_stmt = $dbcon->prepare("INSERT INTO liveblog_raw (username,comment) VALUES (?,?)");
			$user = htmlspecialchars($_POST['username']);
			$comment = htmlspecialchars($_POST['comment']);
			$insert_stmt->bind_param("ss", $user, $comment);
			$insert_stmt->execute();
		}
		else
		{
			echo "{}";
		}
	}
?>