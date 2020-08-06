all:
.SILENT:
PRECMD=echo "  $(@F)" ; mkdir -p $(@D) ;

clean:;rm -rf mid out

serve:;http-server -a localhost src/www
