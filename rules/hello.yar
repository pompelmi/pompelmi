rule HELLO_RULE {
  strings:
    $a = "hello" nocase
  condition:
    $a
}
