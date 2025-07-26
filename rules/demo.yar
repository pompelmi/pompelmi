rule demo_contains_virus_literal {
  strings: $a = "virus" ascii nocase
  condition: $a
}