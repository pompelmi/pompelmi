rule pompelmi_test_marker {
  strings:
    $a = "HELLO-POMPELMI"
  condition:
    $a
}
