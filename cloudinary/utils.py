# Copyright Cloudinary
import zlib, hashlib, re, struct, uuid, base64, time, random, string
from fractions import Fraction
import cloudinary
from cloudinary.compat import (PY3, to_bytes, to_bytearray, to_string, string_types, unquote, urlencode)

""" @deprecated: use cloudinary.SHARED_CDN """
SHARED_CDN = cloudinary.SHARED_CDN

DEFAULT_RESPONSIVE_WIDTH_TRANSFORMATION = {"width": "auto", "crop": "limit"}

RANGE_VALUE_RE = r'^(?P<value>(\d+\.)?\d+)(?P<modifier>[%pP])?$'
RANGE_RE = r'^(\d+\.)?\d+[%pP]?\.\.(\d+\.)?\d+[%pP]?$'
__LAYER_KEYWORD_PARAMS = dict(font_weight = "normal", font_style = "normal", text_decoration = "none", text_align = None, stroke = "none")

def build_array(arg):
    if isinstance(arg, list):
        return arg
    elif arg is None:
        return []
    else:
        return [arg]

def encode_double_array(array):
    array = build_array(array)
    if len(array) > 0 and isinstance(array[0], list):
      return "|".join([",".join([str(i) for i in build_array(inner)]) for inner in array])
    else:
      return ",".join([str(i) for i in array])

def encode_dict(arg):
    if isinstance(arg, dict):
        if PY3:
            items = arg.items()
        else:
            items = arg.iteritems()
        return "|".join((k + "=" + v) for k, v in items)
    else:
        return arg

def generate_transformation_string(**options):
    responsive_width = options.pop("responsive_width", cloudinary.config().responsive_width)
    size = options.pop("size", None)
    if size:
        options["width"], options["height"] = size.split("x")
    width = options.get("width")
    height = options.get("height")
    has_layer = ("underlay" in options) or ("overlay" in options)

    crop = options.pop("crop", None)
    angle = ".".join([str(value) for value in build_array(options.pop("angle", None))])
    no_html_sizes = has_layer or angle or crop == "fit" or crop == "limit" or responsive_width

    if width and (width == "auto" or float(width) < 1 or no_html_sizes):
        del options["width"]
    if height and (float(height) < 1 or no_html_sizes):
        del options["height"]

    background = options.pop("background", None)
    if background:
        background = background.replace("#", "rgb:")
    color = options.pop("color", None)
    if color:
        color = color.replace("#", "rgb:")

    base_transformations = build_array(options.pop("transformation", None))
    if any(isinstance(bs, dict) for bs in base_transformations):
        recurse = lambda bs: generate_transformation_string(**bs)[0] if isinstance(bs, dict) else generate_transformation_string(transformation=bs)[0]
        base_transformations = list(map(recurse, base_transformations))
        named_transformation = None
    else:
        named_transformation = ".".join(base_transformations)
        base_transformations = []

    effect = options.pop("effect", None)
    if isinstance(effect, list):
        effect = ":".join([str(x) for x in effect])
    elif isinstance(effect, dict):
        effect = ":".join([str(x) for x in list(effect.items())[0]])

    border = options.pop("border", None)
    if isinstance(border, dict):
        border = "%(width)spx_solid_%(color)s" % {"color": border.get("color", "black").replace("#", "rgb:"), "width": str(border.get("width", 2))}

    flags = ".".join(build_array(options.pop("flags", None)))
    dpr = options.pop("dpr", cloudinary.config().dpr)
    duration = norm_range_value(options.pop("duration", None))
    start_offset = norm_range_value(options.pop("start_offset", None))
    end_offset = norm_range_value(options.pop("end_offset", None))
    offset = split_range(options.pop("offset", None))
    if (offset):
        start_offset = norm_range_value(offset[0])
        end_offset = norm_range_value(offset[1])  
    
    video_codec = process_video_codec_param(options.pop("video_codec", None));
    
    aspect_ratio = options.pop("aspect_ratio", None)
    if isinstance(aspect_ratio, Fraction):
        aspect_ratio = str(aspect_ratio.numerator) + ":" + str(aspect_ratio.denominator)

    overlay = process_layer(options.pop("overlay", None), "overlay")
    underlay = process_layer(options.pop("underlay", None), "underlay")

    params = {
        "a"  : angle, 
        "ar" : aspect_ratio, 
        "b"  : background, 
        "bo" : border, 
        "c"  : crop, 
        "co" : color, 
        "dpr": dpr,
        "du" : duration,
        "e"  : effect, 
        "eo" : end_offset,
        "fl" : flags, 
        "h"  : height,
        "l"  : overlay, 
        "so" : start_offset,
        "t"  : named_transformation,
        "u"  : underlay, 
        "vc" : video_codec,
        "w"  : width
    }
    simple_params = {
        "ac": "audio_codec",
        "af": "audio_frequency",
        "br": "bit_rate",
        "cs": "color_space",
        "d" : "default_image",
        "dl": "delay",
        "dn": "density",
        "f" : "fetch_format",
        "g" : "gravity",
        "o" : "opacity",
        "p" : "prefix",
        "pg": "page",
        "q" : "quality",
        "r" : "radius",
        "vs": "video_sampling",
        "x" : "x",
        "y" : "y",
        "z" : "zoom"
    }

    for param, option in simple_params.items():
        params[param] = options.pop(option, None)

    transformation = ",".join(sorted([param + "_" + str(value) for param, value in params.items() if (value or value == 0)]))
    if "raw_transformation" in options:
        transformation = transformation + "," + options.pop("raw_transformation")
    transformations = base_transformations + [transformation]
    if responsive_width:
      responsive_width_transformation = cloudinary.config().responsive_width_transformation or DEFAULT_RESPONSIVE_WIDTH_TRANSFORMATION
      transformations += [generate_transformation_string(**responsive_width_transformation)[0]]
    url = "/".join([trans for trans in transformations if trans])

    if width == "auto" or responsive_width:
      options["responsive"] = True
    if dpr == "auto":
      options["hidpi"] = True
    return (url, options)

def split_range(range):
    if (isinstance(range, list) or isinstance(range, tuple)) and len(range) >= 2:
        return [range[0], range[-1]]
    elif isinstance(range, string_types) and re.match(RANGE_RE, range):
        return range.split("..", 1)
    else:
        return None

def norm_range_value(value):
    if value is None:
      return None
    
    match = re.match(RANGE_VALUE_RE, str(value))
    
    if match is None:
      return None

    modifier = '';
    if match.group('modifier') is not None:
      modifier = 'p';
    return match.group('value') + modifier

def process_video_codec_param(param):
    out_param = param
    if isinstance(out_param, dict):
      out_param = param['codec']
      if 'profile' in param:
          out_param = out_param + ':' + param['profile']
          if 'level' in param:
              out_param = out_param + ':' + param['level']
    return out_param

def cleanup_params(params):
    return dict( [ (k, __safe_value(v)) for (k,v) in params.items() if not v is None and not v == ""] )

def sign_request(params, options):
    api_key = options.get("api_key", cloudinary.config().api_key)
    if not api_key: raise ValueError("Must supply api_key")
    api_secret = options.get("api_secret", cloudinary.config().api_secret)
    if not api_secret: raise ValueError("Must supply api_secret")

    params = cleanup_params(params)
    params["signature"] = api_sign_request(params, api_secret)
    params["api_key"] = api_key
    
    return params
  
def api_sign_request(params_to_sign, api_secret):
    to_sign = "&".join(sorted([(k+"="+(",".join(v) if isinstance(v, list) else str(v))) for k, v in params_to_sign.items() if v]))
    return hashlib.sha1(to_bytes(to_sign + api_secret)).hexdigest()

def finalize_source(source, format, url_suffix):
    source = re.sub(r'([^:])/+', r'\1/', source)
    if re.match(r'^https?:/', source):
        source = smart_escape(source)
        source_to_sign = source
    else:
        source = unquote(source)
        if not PY3: source = source.decode('utf8')
        source = smart_escape(source)
        source_to_sign = source
        if url_suffix != None:
            if re.search(r'[\./]', url_suffix): raise ValueError("url_suffix should not include . or /")
            source = source + "/" + url_suffix
        if format != None:
            source = source + "." + format
            source_to_sign = source_to_sign + "." + format

    return (source, source_to_sign)

def finalize_resource_type(resource_type, type, url_suffix, use_root_path, shorten):
    type = type or "upload"
    if url_suffix != None:
        if resource_type == "image" and type == "upload":
            resource_type = "images"
            type = None
        elif resource_type == "raw" and type == "upload":
            resource_type = "files"
            type = None
        else:
            raise ValueError("URL Suffix only supported for image/upload and raw/upload")

    if use_root_path:
        if (resource_type == "image" and type == "upload") or (resource_type == "images" and type is None):
            resource_type = None
            type = None
        else:
            raise ValueError("Root path only supported for image/upload")

    if shorten and resource_type == "image" and type == "upload":
        resource_type = "iu"
        type = None

    return (resource_type, type)

def unsigned_download_url_prefix(source, cloud_name, private_cdn, cdn_subdomain, secure_cdn_subdomain, cname, secure, secure_distribution):
  """cdn_subdomain and secure_cdn_subdomain
  1) Customers in shared distribution (e.g. res.cloudinary.com)
    if cdn_domain is true uses res-[1-5].cloudinary.com for both http and https. Setting secure_cdn_subdomain to false disables this for https.
  2) Customers with private cdn 
    if cdn_domain is true uses cloudname-res-[1-5].cloudinary.com for http
    if secure_cdn_domain is true uses cloudname-res-[1-5].cloudinary.com for https (please contact support if you require this)
  3) Customers with cname
    if cdn_domain is true uses a[1-5].cname for http. For https, uses the same naming scheme as 1 for shared distribution and as 2 for private distribution."""
  shared_domain = not private_cdn
  shard = __crc(source)
  if secure:
      if secure_distribution is None or secure_distribution == cloudinary.OLD_AKAMAI_SHARED_CDN:
          secure_distribution = cloud_name + "-res.cloudinary.com" if private_cdn else cloudinary.SHARED_CDN

      shared_domain = shared_domain or secure_distribution == cloudinary.SHARED_CDN
      if secure_cdn_subdomain is None and shared_domain:
          secure_cdn_subdomain = cdn_subdomain

      if secure_cdn_subdomain:
          secure_distribution = re.sub('res.cloudinary.com', "res-" + shard + ".cloudinary.com", secure_distribution)

      prefix = "https://" + secure_distribution
  elif cname:
      subdomain = "a" + shard + "." if cdn_subdomain else ""
      prefix = "http://" + subdomain + cname
  else:
      subdomain = cloud_name + "-res" if private_cdn else "res"
      if cdn_subdomain: subdomain = subdomain + "-" + shard
      prefix = "http://" + subdomain + ".cloudinary.com"

  if shared_domain: prefix += "/" + cloud_name

  return prefix

def cloudinary_url(source, **options):
    original_source = source

    type = options.pop("type", "upload")
    if type == 'fetch':
        options["fetch_format"] = options.get("fetch_format", options.pop("format", None))
    transformation, options = generate_transformation_string(**options)

    resource_type = options.pop("resource_type", "image")
    version = options.pop("version", None)
    format = options.pop("format", None)
    cdn_subdomain = options.pop("cdn_subdomain", cloudinary.config().cdn_subdomain)
    secure_cdn_subdomain = options.pop("secure_cdn_subdomain", cloudinary.config().secure_cdn_subdomain)
    cname = options.pop("cname", cloudinary.config().cname)
    shorten = options.pop("shorten", cloudinary.config().shorten)

    cloud_name = options.pop("cloud_name", cloudinary.config().cloud_name or None)
    if cloud_name is None:
        raise ValueError("Must supply cloud_name in tag or in configuration")
    secure = options.pop("secure", cloudinary.config().secure)
    private_cdn = options.pop("private_cdn", cloudinary.config().private_cdn)
    secure_distribution = options.pop("secure_distribution", cloudinary.config().secure_distribution)
    sign_url = options.pop("sign_url", cloudinary.config().sign_url)
    api_secret = options.pop("api_secret", cloudinary.config().api_secret)
    url_suffix = options.pop("url_suffix", None)
    use_root_path = options.pop("use_root_path", cloudinary.config().use_root_path)

    if url_suffix and not private_cdn:
        raise ValueError("URL Suffix only supported in private CDN")

    if (not source) or type == "upload" and re.match(r'^https?:', source):
        return (original_source, options)

    resource_type, type = finalize_resource_type(resource_type, type, url_suffix, use_root_path, shorten)
    source, source_to_sign = finalize_source(source, format, url_suffix)


    if source_to_sign.find("/") >= 0 and not re.match(r'^https?:/', source_to_sign) and not re.match(r'^v[0-9]+', source_to_sign) and not version:
        version = "1"
    if version: version = "v" + str(version)
    
    transformation = re.sub(r'([^:])/+', r'\1/', transformation)
    
    signature = None
    if sign_url:
        to_sign = "/".join(__compact([transformation, source_to_sign]))
        signature = "s--" + to_string(base64.urlsafe_b64encode( hashlib.sha1(to_bytes(to_sign + api_secret)).digest() )[0:8]) + "--"
    
    prefix = unsigned_download_url_prefix(source, cloud_name, private_cdn, cdn_subdomain, secure_cdn_subdomain, cname, secure, secure_distribution)
    source = "/".join(__compact([prefix, resource_type, type, signature, transformation, version, source]))
    return (source, options)

def cloudinary_api_url(action = 'upload', **options):
    cloudinary_prefix = options.get("upload_prefix", cloudinary.config().upload_prefix) or "https://api.cloudinary.com"
    cloud_name = options.get("cloud_name", cloudinary.config().cloud_name)
    if not cloud_name: raise ValueError("Must supply cloud_name")
    resource_type = options.get("resource_type", "image")
    return "/".join([cloudinary_prefix, "v1_1", cloud_name, resource_type, action])

# Based on ruby's CGI::unescape. In addition does not escape / :
def smart_escape(string):
    pack = lambda m: to_bytes('%' + "%".join(["%02X" % x for x in struct.unpack('B'*len(m.group(1)), m.group(1))]).upper())
    return to_string(re.sub(to_bytes(r"([^a-zA-Z0-9_.\-\/:]+)"), pack, to_bytes(string)))

def random_public_id():
    return ''.join(random.SystemRandom().choice(string.ascii_lowercase + string.digits) for _ in range(16))

def signed_preloaded_image(result):
    filename = ".".join([x for x in [result["public_id"], result["format"]] if x])
    path = "/".join([result["resource_type"], "upload", "v" + str(result["version"]), filename])
    return path + "#" + result["signature"]

def now():
  return str(int(time.time()))
  
def private_download_url(public_id, format, **options):
  cloudinary_params = sign_request({
    "timestamp": now(), 
    "public_id": public_id, 
    "format": format, 
    "type": options.get("type"),
    "attachment": options.get("attachment"),
    "expires_at": options.get("expires_at")
  }, options)

  return cloudinary_api_url("download", **options) + "?" + urlencode(cloudinary_params)

def zip_download_url(tag, **options):
  cloudinary_params = sign_request({
    "timestamp": now(), 
    "tag": tag,
    "transformation": generate_transformation_string(**options)[0] 
  }, options)

  return cloudinary_api_url("download_tag.zip", **options) + "?" + urlencode(cloudinary_params)

def build_eager(transformations):
    eager = []
    for tr in build_array(transformations):
        format = tr.get("format")
        single_eager = "/".join([x for x in [generate_transformation_string(**tr)[0], format] if x])
        eager.append(single_eager)
    return "|".join(eager)

def build_custom_headers(headers):
    if headers is None:
        return None
    elif isinstance(headers, list):
        pass
    elif isinstance(headers, dict):
        headers = [k + ": " + v for k, v in headers.items()]
    else:
        return headers
    return "\n".join(headers)

def build_upload_params(**options):
    params = {"timestamp": now(),
              "transformation": generate_transformation_string(**options)[0],
              "public_id": options.get("public_id"),
              "callback": options.get("callback"),
              "format": options.get("format"),
              "type": options.get("type"),
              "backup": options.get("backup"),
              "faces": options.get("faces"),
              "image_metadata": options.get("image_metadata"),
              "exif": options.get("exif"),
              "colors": options.get("colors"),
              "headers": build_custom_headers(options.get("headers")),
              "eager": build_eager(options.get("eager")),
              "use_filename": options.get("use_filename"),
              "unique_filename": options.get("unique_filename"),
              "discard_original_filename": options.get("discard_original_filename"),
              "invalidate": options.get("invalidate"),
              "notification_url": options.get("notification_url"),
              "eager_notification_url": options.get("eager_notification_url"),
              "eager_async": options.get("eager_async"),
              "proxy": options.get("proxy"),
              "folder": options.get("folder"),
              "overwrite": options.get("overwrite"),
              "tags": options.get("tags") and ",".join(build_array(options["tags"])),
              "allowed_formats": options.get("allowed_formats") and ",".join(build_array(options["allowed_formats"])),
              "face_coordinates": encode_double_array(options.get("face_coordinates")),
              "custom_coordinates": encode_double_array(options.get("custom_coordinates")),
              "context": encode_dict(options.get("context")),
              "moderation": options.get("moderation"),
              "raw_convert": options.get("raw_convert"),
              "ocr": options.get("ocr"),
              "categorization": options.get("categorization"),
              "detection": options.get("detection"),
              "similarity_search": options.get("similarity_search"),
              "background_removal": options.get("background_removal"),
              "upload_preset": options.get("upload_preset"),
              "phash": options.get("phash"),
              "return_delete_token": options.get("return_delete_token"),
              "auto_tagging": options.get("auto_tagging") and float(options.get("auto_tagging"))}
    return params

    
    
def __process_text_options(layer, layer_parameter):
    font_family = layer.get("font_family")
    font_size = layer.get("font_size")
    keywords = []
    for attr, default_value in __LAYER_KEYWORD_PARAMS.iteritems():
        attr_value =layer.get(attr)
        if (attr_value != default_value and attr_value is not None):
            keywords.append(attr_value)

    letter_spacing = layer.get("letter_spacing")
    if letter_spacing != None:
        keywords.append("letter_spacing_" + str(letter_spacing))

    if font_size is None and font_family is None and len(keywords) == 0:
        return None

    if font_family is None:
        raise ValueError("Must supply font_family for text in " + layer_parameter)

    if font_size is None:
        raise ValueError("Must supply font_size for text in " + layer_parameter)

    keywords.insert(0, font_size)
    keywords.insert(0, font_family)
    
    return '_'.join([str(k) for k in keywords])

def process_layer(layer, layer_parameter):
    if not isinstance(layer, dict):
        return layer

    resource_type = layer.get("resource_type")
    text = layer.get("text")
    type = layer.get("type")
    public_id = layer.get("public_id")
    format = layer.get("format")
    components = list()
    
    if text != None and resource_type is None:
        resource_type = "text"
    
    if public_id is not None and format is not None:
        public_id = public_id + "." + format
    
    if public_id is None and resource_type != "text":
        raise ValueError("Must supply public_id for for non-text " + layer_parameter)
    
    if resource_type is not None and resource_type != "image":
        components.append(resource_type)
    
    if type is not None and type != "upload":
        components.append(type)
    
    if resource_type == "text" or resource_type == "subtitles":
        if public_id is None and text is None:
            raise ValueError("Must supply either text or public_id in " + layer_parameter)
    
        text_options = __process_text_options(layer, layer_parameter)
    
        if text_options is not None:
            components.append(text_options)
    
        if public_id is not None:
            public_id = public_id.replace("/",':')
            components.append(public_id)
    
        if text is not None:
            text = smart_escape(text)
            text = text.replace("%2C", "%E2%80%9A")
            text = text.replace("/", "%E2%81%84")
            components.append(text)
    else:
        public_id = public_id.replace("/",':')
        components.append(public_id)
    
    return ':'.join(components)

def __join_pair(key, value):
    if value is None or value == "":
        return None
    elif value is True:
        return key
    else:
        return u"{0}=\"{1}\"".format(key, value)

def html_attrs(attrs, only=None):
    return ' '.join(sorted([__join_pair(key, value) for key, value in attrs.items() if only is None or key in only]))

def __safe_value(v):
    if isinstance(v, (bool)):
        if v:
            return "1"
        else: 
            return "0"
    else:
        return v
def __crc(source):
    return str((zlib.crc32(to_bytearray(source)) & 0xffffffff)%5 + 1)

def __compact(array):
    return filter(lambda x: x, array)

