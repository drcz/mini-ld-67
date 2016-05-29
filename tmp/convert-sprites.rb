#!/usr/bin/ruby

s=:WAIT_TTL;
puts "var Sprites = {"
`cat sprts`.split("\n").each{|l|
  case s
    when :WAIT_TTL
    if l.start_with?("  ///")
      ttl = l.split("/// ")[1];
      puts "'#{ttl}' : mk_sprite('#ffffff', [";
      s=:WAIT_SPR;
    end

    when :WAIT_SPR
    if l=="  {SPRITE_W,SPRITE_H,"
      s=:CONVERT;
    end

    when :CONVERT
    if l=="  },"
      s=:WAIT_TTL;
      puts "]),"
    else
      l0 = l.gsub("0b","\"").gsub(",","\",");
      l0 = l0+"\"" if not l.end_with?(",");
      puts l0
    end
  end
}
puts "};"
