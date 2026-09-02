# SRC068 split assets

Variant data only (title + 9 archive image URLs per mediaVariant).
Image BYTES remain Drive-authority; they are not vendored here.

Deployment constraint (unchanged from authority): imageUrls paths are
relative (`../images/*.png`). Serve split/index.html from the SAME
directory depth as the authority original, or rebase via the product
adapter OUTSIDE this source (S4+/MVP concern, not S3).

Hero MP4s are absolute CloudFront URLs; depth-independent.
