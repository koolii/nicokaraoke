;$(function(){

	////////////////////////////////////////////////////////
	//                       TODO                         //
	// 録音した音声と取得している動画を同時に再生したいのだが       //
	// 今のままだと誤差が生じてしまい正しく聞こえてこない             //
	// そこを修正する必要がある。                              //
	// 少し調べたところWebAuioAPIがなんとかしてくれるかもしれない     //
	///////////////////////////////////////////////////////

	var input, recorder;

	// カメラから取得したストリームを表示するDOMオブジェクト
	var video = document.querySelector('video');

	// 作成した音声ファイルを再生するオーディオのDOMオブジェクト
	//var audio = document.querySelector('audio');
	var audio = document.getElementById("recordAudio");
	var streamAudio = document.getElementById("streamAudio");
	var audioContext;
	var $audio = $("#audio");

	// 各種ボタン
	var $store = $("#store");
	var $start = $("#start");
	var $end = $("#end");
	var $mute = $("#mute");
	var $pause = $("#pause");
	var $videoNonDisplay = $("#video_non_display");
	var $record_play = $("#record_play");
	var record_flg = $("#record_flg").prop("checked");
	var $ranking = $("#ranking");
	var $tooltip = $("#tooltip")

	// プレーヤー操作するオブジェクト
	$.playerOperate = {
		play: function() {
			if($.player != undefined) {
				$.player.ext_play(true);
				console.log("player start");
			}
		},

		stop: function() {
			if ($.player != undefined) {
				$.player.ext_play(false);
				console.log("player stop");
			}
		},

		restart: function() {
			if ($.player != undefined) {
				// log
				console.log("ext_getPlayheadTime " + $.player.ext_getPlayheadTime());

				// stop temporary
				//$.stop();
				//console.log("stop");

				// move seek bar to head
				$.player.ext_setPlayheadTime($.player.ext_getPlayheadTime() * -1);

				// restart player
				// if ($.player.ext_getStatus() != "playing") {
				// 	play();
				// 	console.log("change status to playing");
				// }

				console.log("move to head !!");

				if ($.player.ext_getStatus() == "paused") {
					play();
					console.log("play");
				}

			}
		},

		end: function() {
			// もしもリピートボタンが押下されている場合は動画を最初までシークする
			if ($("#player_repeat").data("repeat") == true) {
				$("#player_head").trigger("click");
			}
		}
	}

	// 音声ファイルを作成することが出来るかどうか判定
	var isCreateSoundFile = false;

	var htmlCreate = {
		addClasses: function($target, classes) {
			return $target.addClass(classes);
		},
		img: function(options) {
			var $img = $("<img>");

			$img.attr("src", options.src);

			$img = this.addClasses($img, options.class)

			return $img;
		},
		li: function(options) {
			var $li = $("<li>");
			var i, n;

			// KVS
			if (options.data != undefined || options.data != "") {
				for (key in options.data) {
					$li.data(key, options.data[key])
				}
			}

			if (options.id != undefined) {
				$li.attr("id", options.id);
			}

			return this.addClasses($li, options.class);
		}
	};


	// どのブラウザを使用しているかを取得
	var _ua = (function(){
		return {
			Blink:window.chrome,
			Webkit:typeof window.chrome == "undefined" && 'WebkitAppearance' in document.documentElement.style
		}
	})();

	// どのブラウザを使用しているかチェック
	if (!_ua.Blink) {
		$("#glayLayer").show();
		$(".browser_error").show();

		$("body").on("click", function(e) {
			e.preventDefault();
			e.stopPropagation();
			$("#glayLayer").fadeOut();
			$(".browser_error").fadeOut();
		});
	}

	// お気に入り登録_WebStorage(localStorage)
	var storageHelper = {
		storage: localStorage,
		set: function(key, target) {
			if (this.storage == undefined) {
				return false;
			}

			// 送られたtargetがObjectだった場合はJSONを作成する
			// if (typeof target == "Object") {
			// 	target = JSON.stringify(target);
			// }

	 		this.storage.setItem(key, target);
	 	},
		get: function(key) {
			if (this.storage == undefined) {
				return false;
			}

			// WebStorageからkeyによってvalueを文字列で取得する
			var target = this.storage.getItem(key);

			// JSON文字列なのか普通の文字列なのか判定を行いたい
			//　targetが普通の文字列だった場合にエラーが起きてしまう
			try {
				// JSONオブジェクトに変換
				target = JSON.parse(target);
			} catch(e) {
				console.log(e);
				return false;
			}

			// JSONを返す
			return target;
		},
		add: function(key, target) {
			if (this.storage == undefined) {
				return false;
			}

			var json, i, n, jsonObject;

			// DOMからJSONにするためのオブジェクトを作成する
			var obj = this.createObject(target);

			// JSONにするためのオブジェクトをためておく配列を宣言する
			var array = [];

			// 引数として渡されたkeyがすでにWebStorageに格納されているかチェック

			// 引数のkeyからWebStorageのvalueを取得する
			var storageValueBykey = this.get(key);

			for (i = 0, n = storageValueBykey.length; i < n; i++) {
				jsonObject = storageValueBykey[i];

				if (jsonObject.videoId == obj.videoId) {
					tooltip("すでにお気に入りに登録されています", undefined, "#C92818");
					return false;
				}
			}

			// keyに紐づくオブジェクトが存在しなかったら設定する
			// 存在すれば卑劣に追加する
			if (storageValueBykey == undefined || storageValueBykey == "") {
				// 配列をJSONに変換する
				array.push(obj);
				json = JSON.stringify(array);
				this.set(key, json);
			} else {
				// JSON文字列をオブジェクトの配列に変換する
				array = storageValueBykey;

				// 新たに追加するオブジェクトを追加する
				array.push(obj);

				this.set(key, JSON.stringify(array));
			}
		},
		remove: function(key, target) {
			var jsonObjectArray = this.get(key);
			var returnArray = [];
			var removeVideoId = $(target).data("videoId");
			var i, n, jsonObject;

			for (i = 0, n = jsonObjectArray.length; i < n; i++) {
				jsonObject = jsonObjectArray[i];

				if (jsonObject.videoId == removeVideoId) {
					continue;
				} else {
					returnArray.push(jsonObject);
				}
			}

			this.set(key, JSON.stringify(returnArray));
		},
		clear: function(target) {
			if (this.storage == undefined) {
				return false;
			}

			if (target == undefined) {
				this.storage.clear();
			} else {
				this.storage.removeItem(target);
			}
		},
		createObject: function(targetDOM) {
			var videoTitleStr, imgSrcStr, videoIdStr;

			// 今はテスト段階なので予約リストからしかこないような処理になっている
			videoTitleStr = $(targetDOM).data("videoTitle");
			imgSrcStr = $(targetDOM).data("imgSrc");
			videoIdStr = $(targetDOM).data("videoId");

			// WebStorageに登録するときはそれぞれクラスを前もって付加させておき、そこから取得する
			// title: storage_title
			// img: storage_img
			// time: storage_time

			return { videoId: videoIdStr, videoTitle: videoTitleStr, imgSrc: imgSrcStr};
		}
	 };


	var appInit = function() {
		// ブラウザを互換関係
		// navigator.getUserMedia に統一
		navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;

		// window.URL に統一
		window.URL = window.URL || window.webkitURL;

		AudioContext = AudioContext || webkitAudioContext;

		// webkitAudioContextでやらないとChromeで読み込んでくれない
		// 他のブラウザでは試していない
		audioContext = new AudioContext();
		sampleRate = audioContext.sampleRate;
		// $("#console_log").text("sample rate:" + sampleRate);

		lowpassFilter = audioContext.createBiquadFilter();
		lowpassFilter.type = 0;
		lowpassFilter.frequency.value = 44100;

		analyser = audioContext.createAnalyser();
		analyser.fftSize = 1024;
		analyser.smoothingTimeContant = 0.9;

		if (!navigator.getUserMedia) {
			alert("WebRTC(getUserMedia) is not supported.");
			return;
		}

		navigator.getUserMedia({video: false, audio: true}, function(stream) {
			input = audioContext.createMediaStreamSource(stream);

			input.connect(lowpassFilter);
			lowpassFilter.connect(analyser);
			//lowpassFilter.connect(audioContext.destination);

			// videoタグにカメラからのストリーム情報を埋め込む
			// 動いていることを確認しやすくするために埋め込んだ物
			// またここをコメントアウトすることにより、音声も聞こえなくなる！！OK!!
			//$(video).removeClass("display-none");
			//video.src = window.URL.createObjectURL(stream);
			//video.mute = true;
			streamAudio.src = window.URL.createObjectURL(stream);

			recorder = new Recorder(lowpassFilter, { workerPath: './recorderWorker.js' });

			// 録音機能等のイベントを作成
			$.record = {
				start: function () {
					// log
					console.log("start event");

					// 録音開始ボタンを押下できないようにする
					$(this).attr("disabled", "disabled");
					$end.removeAttr("disabled");

					// 音声ファイルを作成できるようにする
					isCreateSoundFile = true;
					recorder.record();
				},
				paused: function() {
					// log
					console.log("pause event");

					// 録音を一時停止する
					recorder.stop();

					// 録音開始ボタンを押下できるようにし
					// 開始ボタンの文言を再開に変更する
					if (isCreateSoundFile) {
						$start.removeAttr("disabled").text("録音再開");
					}
				},
				finish: function() {
					// log
					console.log("end event");

					// 録音が開始されている場合
					if (isCreateSoundFile) {
						recorder.stop();
						recorder.exportWAV(wavExport);
						$start.removeAttr("disabled").text("録音開始");
					}

					// 録音終了ボタンが押下された時は
					// 録音が開始されたいようとなかろうと音声ファイルを作成できないようにする
					isCreateSoundFile = false;
				},
				// プレーヤーが終了した時のコールバック
				onEnd: function() {
					// 録音しているかどうか判定する
					var recording = recorder.getStatus();

					// 録音していない場合
					// if (!recording) {
					// 	// 次の曲を強制的にクリックするイベントを実行
					// 	$("#music_list > li:first-child").trigger("click");
					// }
				}
			};

			// 録音するためのコンポーネントを表示させる
			$("#recording_components").removeClass("display-none");

		}, function(error) {
			alert(error.name);
		});
	};

	var createNicoPlayer = function(url) {
		// フレームを取得する
		var iframe = $("iframe")[0];

		// urlが入力されている場合
		if (url == "") {
			return false;
		}

		// iframeに埋め込むHTMLを作成する
		var html = createPlayerHtml(url);

		// 最初以外の処理
		if (iframe != undefined) {
			// empty DOM in iframe
			$(iframe).empty();

			// ニコニコ動画を取得するスクリプトを含めたHTMLを作成する
			createIframe(iframe, html);
			$(iframe).trigger("load");
		} else {
			// at the first time job
			// it isn't very good using document.open and document.write for HTML5 + XHTML
			// create iframe
			iframe = document.createElement("iframe");

			//////////////////
			//     TODO     //
			//  change DOM  //
			// create class //
			//////////////////
			$(iframe).css({
				width: "700px",
				height: "400px"
			})//.attr("sandbox", "allow-same-origin allow-scripts")
			.appendTo($("#player"));

			createIframe(iframe, html);
		}


		// iframeを動画を作成する度にボタンに対してイベントを再度付与する
		$("#player_start").on("click", $.playerOperate.play);
		$("#player_stop").on("click", $.playerOperate.stop);
		$("#player_head").on("click", $.playerOperate.restart);

		$("#player_mute").on("click", function() {
			if ($.player != undefined) {
				// 現在のボリュームを保持
				$(this).data("volume", $.player.ext_getVolume());

				// ミュート処理
				$.player.ext_setMute(true);
			}
			return false;
		});

		$("#player_volumu_on").on("click", function() {
			var volume = $("#player_mute").data("volume");
			if ($.player != undefined && volume != undefined) {
				// ミュート解除処理
				$.player.ext_setMute(false);

				// ボリューム設定
				$.player.ext_setVolume(volume);
			}
		});

		// 機能していない
		$("#player_repeat").on("click", function() {
			var $this = $(this);
			var flg = $this.data("repeat");

			if (flg == undefined || flg == false) {
				$this.data("repeat", true);
			} else {
				$this.data("repeat", false);
			}
		});

		$("#player_comment").on("click", function() {
			if ($.player != undefined) {
				var flg = $.player.ext_isCommentVisible();
				$.player.ext_setCommentVisible(!flg);
			}
		});

		$("#play_record").on("click", function() {
			if ($.player == undefined) {
				return false;
			}

			// プレーヤーの再生
			// 一度動画を最初に移動させてから動画を再生しようとしたが正しく動作しなかった。
			// なぜかはわからなかったが、逆に動画を再生させてから冒頭に戻す処理をすることで動作するようになった
			play();

			var times = $.player.ext_getPlayheadTime();
			if (times != 0) {
				$.player.ext_setPlayheadTime(-1 * times);
			}

			// チェックボックスにチェックを入れている場合
			if ($("#record_flg").prop("checked")) {
				// 録音開始
				$start.trigger("click");
			}
		});
	};

	var tooltip = function(text, fadeBool, backgroundColor) {
		defaultBackgroundColor = "#000000";
		$tooltip.text(text);

		// change backgroundColor
		if (backgroundColor != undefined) {
			$tooltip.css("background-color", backgroundColor);
		} else {
			$tooltip.css("background-color", defaultBackgroundColor);
		}

		if (fadeBool == true) {
			$tooltip.fadeIn();

			setTimeout(function() {
				$tooltip.fadeOut();
			}, 3000);
		} else {
			$tooltip.show();
		}

		return false;
	};

	var createMusicList = function(title, imageLink, videoId) {

		// ツールチップを表示する
		tooltip(title + "をリストに追加しました", true);


		if (title.length > 30) {
			title = title.slice(0, 30);
			title += "…";
		}

		// liタグを作成する
		// var li = $("<li>")
		// 			.html(innerHTML)
		// 			.addClass("music")
		// 			.data("url", url)
		// 			.appendTo($("#music_list"));
		var $li = htmlCreate.li({ data: { videoId: videoId, imgSrc: imageLink, videoTitle: title }, class: "music clearfix" })
					.append(htmlCreate.img({ src: imageLink, class: "list_music_img " }) );

		$li.append("<span class='list_music_font'>" + title + "</span>" + "<img src='./images/close.gif' class='close_list' style='float: right; padding: 5px;'>");
		$li.appendTo("#music_list");
	};

	// マイク実行
	$("#entry_mic, .arrow_box").on("click", function(e) {
		e.preventDefault();
		e.stopPropagation();

		appInit();

		$(".arrow_box").remove();

		// 一度onClickイベントを殺す必要がある off
		$(this).off("click");

		// マイクのアイコンを押下した時のイベントを更新する
		$("#entry_mic").on("click", function() {
			// TODO
			alert("test");
		});

		$("#entry_mic").remove();
	});


	var scrolling = function($target) {
		//console.log("test " + objectStorage);
		$("html, body").animate({ scrollTop: $target.offset().top }, "slow", "swing")
		return false;
	};

	// お気に入りの動画を初期状態で表示させます
	// localStorageが存在している
	// storageHelper.init()とかにしてみても良い！
	if (storageHelper.storage != undefined) {
		var jsonObjectArray = storageHelper.get("favorite");

		// key="favorite"からオブジェクト(配列)が取得できたら
		if (Array.isArray(jsonObjectArray)) {
			var i, n, jsonObject;

			//
			for (i = 0, n = jsonObjectArray.length; i < n; i++) {
				jsonObject = jsonObjectArray[i];

				//liを作成
				var $li = htmlCreate.li({ videoId: jsonObject.videoId, data: { videoId: jsonObject.videoId, videoTitle: jsonObject.videoTitle, imgSrc: jsonObject.imgSrc }, class: "search-result-movie" });
				$li.append("<span>").append(htmlCreate.img({ src: jsonObject.imgSrc, class: "float-left" }));

				$li.append("<div class='float-left favorite-content-area'><span>" + jsonObject.videoTitle + "</span></div>")
				   .append("<div class='favorite_close_area'><img src='./images/SVG/cancel4.svg' class='favorite_close'></div>").appendTo($("#favorite_videos"));
			}

			if ($("#favorite_videos > li").size() != 0) {
				$("#favorite_videos").prev().hide();
			}
		}
	}

	// 動的に作成したliタグに対してclickイベントを付与する
	$(document).on("click", ".music", function() {
		if (confirm("この曲をカラオケしますか？")) {
			createNicoPlayer($(this).data("videoId"));
			$(".movie_title").text($(this).data("videoTitle"));

			$("#back-top").find("img").trigger("click");
			$("#menu").trigger("click");

			var data = $(this).data();

			// プレイヤーのお気に入りボタンを押下した時に登録できるように
			$("#player").data({
				"videoTitle": data.videoTitle,
				"videoId": data.videoId,
				"imgSrc": data.imgSrc
			});
		}
	});

	$(document).on("click", ".favorite_close", function(e) {
		var target = $(this).closest(".search-result-movie");
		e.stopPropagation();
		e.preventDefault();

		target.fadeOut(400, function() {
			$(this).remove();
		});

		storageHelper.remove("favorite", target);

		if ($("#favorite_videos > li").size() == 0) {
			$("#favorite_videos").prev().show();
		}
	});

	$(document).on("click", ".favorite_add", function(e) {
		e.preventDefault();
		e.stopPropagation();
		var $target = $(this).closest("li");
		var data = $target.data();

		tooltip($target.data("videoTitle") + "をお気に入りに追加しました", true, "#E1541F");

		if (storageHelper.add("favorite", $target) != false) {
			//liを作成
			var $li = htmlCreate.li({ data: data, class: "search-result-movie display-none" });
			$li.append("<span>").append(htmlCreate.img({ src: data.imgSrc, class: "float-left" }));

			$li.append("<div class='float-left favorite-content-area'><span>" + data.videoTitle + "</span></div>")
			   .append("<div class='favorite_close_area'><img src='./images/SVG/cancel4.svg' class='favorite_close'></div>").appendTo($("#favorite_videos"));

			$li.fadeIn(400);

			if ($("#favorite_videos > li").size() != 0) {
				$("#favorite_videos").prev().hide();
			}
		}
	});

	$("#favorite_add_current").on("click", function(e) {
		var $target = $("#player");

		e.preventDefault();
		e.stopPropagation();

		var data = $target.data();

		tooltip($target.data("videoTitle") + "をお気に入りに追加しました", true, "#E1541F");

		if (storageHelper.add("favorite", $target) != false) {
			//liを作成
			var $li = htmlCreate.li({ data: data, class: "search-result-movie display-none" });
			$li.append("<span>").append(htmlCreate.img({ src: data.imgSrc, class: "float-left" }));

			$li.append("<div class='float-left favorite-content-area'><span>" + data.videoTitle + "</span></div>")
			   .append("<div class='favorite_close_area'><img src='./images/SVG/cancel4.svg' class='favorite_close'></div>").appendTo($("#favorite_videos"));

			$li.fadeIn(400);

			if ($("#favorite_videos > li").size() != 0) {
				$("#favorite_videos").prev().hide();
			}
		}
	})

	// 選択したliタグを削除する。
	// またstopPropagationによってクリックしたイベントをバブリングするのを防いでいる
	$(document).on("click", ".close_list", function(e) {
		e.stopPropagation();
		$(this).closest(".music").remove();
	});

	// 検索した結果を表示しているDOMをクリックした時のイベント
	$(document).on("click", ".search-result-movie, .ranking-result-movie", function(e) {
		//$("#searchResult").addClass("display-none");
		e.preventDefault();
		var $this = $(this);

		if (!$(this).hasClass("more")) {
			createMusicList($this.data("videoTitle"), $this.data("imgSrc"), $this.data("videoId"));
		}
	});

	// $(document).on("click", ".search-result-unique-movie", function() {
	// 	var $li = $("<li>").html($(this).html());

	// 	createMusicList($li.removeClass("search-result-unique-movie"));
	// });

	// もっと見るボタンを押下したとき
	$(document).on("click", ".more", function() {
		var $this = $(this);

		if ($this.data("query") != undefined) {
			searchVideos($this.data("query"), $this.data("from"));
		} else {
			searchRankingMovie($this.data("from"), $this.data("ranking"));
		}
	});



	// カラオケしたい曲を溜めるイベント処理
	// ここはかなり適当だしちゃんと機能していない
	// $store.on("click", function() {
	// 	// 動画のurl情報から動画(一件)情報を取得する
	// 	searchUniqueVideo($("#nico_url").val());

	// 	$("#searchResult").trigger("click");
	// });


	// 初期時は録音終了ボタンは押下できないようにしておく
	$end.attr("disabled", "disabled");

	// 画面を離れようとしたときの処理
	$(window).on("beforeunload", function() {
		if ($.player != undefined) {
			//stop();
		}

		return "ページを離れると予約リストが削除されます。\nお気に入りに登録しておくとページを離れても削除されません。\n本当によろしいですか？";
	});


	// 開始ボタンが押下された時の処理
	$start.on("click", function(e) {
		e.preventDefault();

		// log
		console.log("start event");

		// 録音開始ボタンを押下できないようにする
		$(this).attr("disabled", "disabled");
		$end.removeAttr("disabled");

		// 音声ファイルを作成できるようにする
		isCreateSoundFile = true;
		recorder.record();
	});

	// 一時停止ボタンが押下された時の処理
	$pause.on("click", function(e) {
		e.preventDefault();

		// log
		console.log("pause event");

		// 録音を一時停止する
		recorder.stop();

		// 録音開始ボタンを押下できるようにし
		// 開始ボタンの文言を再開に変更する
		if (isCreateSoundFile) {
			$start.removeAttr("disabled").text("録音再開");
		}
	});

	// 終了ボタンが押下された時の処理
	$end.on("click", function(e) {
		e.preventDefault();

		// log
		console.log("end event");

		// 録音が開始されている場合
		if (isCreateSoundFile) {
			recorder.stop();
			recorder.exportWAV(wavExport);
			$start.removeAttr("disabled").text("録音開始");
		}

		// 録音終了ボタンが押下された時は
		// 録音が開始されたいようとなかろうと音声ファイルを作成できないようにする
		isCreateSoundFile = false;
	});

	// (リアルタイムに聞こえる自分の)音声ミュートボタンが押下された時の処理
	$mute.on("click", function(e) {
		e.preventDefault();
		changeMuteButtonInfo(video.muted == true ? false : true);
	});

	// Enterキーを押下することでリクエストを送信できるようにする
	$("#nico_url, #search").on("keydown", function(e) {
		if ((e.which && e.whick == 13) || (e.keyCode && e.keyCode == 13)) {
			$("#search").trigger("click");
		}
	})

	// 検索ボタンを押下したとき
	$("#search").on("click", function() {
		// 動画のurl情報から動画(一件)情報を取得する
		var searchString = $("#nico_url").val();

		if (searchString.length <= 0) {
			return false;
		}

		searchVideos(searchString);
	});


	function test($target, className) {
		if (!$target.hasClass(className)) {
			$target.addClass(className);
		} else {
			$target.removeClass(className);
		}
	};

	// 右に表示させるリストを表示させる時の処理
	$("#menu").on("click", function() {
		// test($("#tooltip"), "tooltip_on_menu");
		// test($("#entry_mic"), "entry_mic_on_menu");
		// test($("#back-top"), "back-top_on_menu");
		// test($("#scroll_menu"), "scroll_menu_on_menu");
		// test($("#scroll_ranking"), "scroll_ranking_on_menu");
		// test($("#scroll_search"), "scroll_search_on_menu");

		$("#main").data("right_menu", true);
	});

	// 右のリストを隠す処理
	$("#close_menu").on("click", function() {
		$("#menu").trigger("click");
	});

	$("#scroll_menu").on("click", function() {
		var scrollMenu = $("#scroll_menu_list");

		if (scrollMenu.css("display") == "none") {
			scrollMenu.fadeIn();
		} else {
			scrollMenu.fadeOut();
		}
	});

	// $("body").on("click", function() {
	// 	if ($("#scroll_menu_list").css("display") == "none") {
	// 		$("#scroll_menu_list").fadeOUt();
	// 	}
	// });

	// トップページまでスクロールする
	$("#back-top img, aside li").on("click", function(e) {
		// これを入れないと挙動がおかしくなる
		e.preventDefault();
		scrolling($($(this).parent().attr("href")));
	});


	// ドラッグ&ドロップのイベント
	// $("body").on("dragover dragenter dragleave", function(e) {
	// 	e.preventDefault();
	// 	e.stopPropagation();
	// });

	var dropDown = {
		$glay_layer: $("#glayLayer"),
		$drag_drop: $("#drag_drop"),
		audio: $("#tmp_audio")[0],
		speed: 200,
		show: function() {
				if (this.$glay_layer.css("display") == "none") {
					this.$glay_layer.fadeIn(this.speed);
					this.$drag_drop.fadeIn(this.speed);

					console.log("drag dragover test");

					return false;
				}
			},
		hide: function(func) {
		 	this.$glay_layer.fadeOut(this.speed);
		 	this.$drag_drop.fadeOut(this.speed, func);
	 	},
	 	reset: function() {
	 		var area = this.$drag_drop;

	 		if (this.audio != undefined) {
	 			delete this.audio.src;
	 		}

	 		$("#drag_drop > ul").find("li").text("");
	 	}
	};


	$("#file_import_area").on("click", function(e) {
		e.preventDefault();
		e.stopPropagation();

		dropDown.show();
	});

	$("#file_import_area > h2").on("click", function(e) {
		e.preventDefault();
		e.stopPropagation();
	});

	$("body").on("dragover", function(e) {
		e.preventDefault();
		e.stopPropagation();

		//dropDown.show();
	});

	$("#add_audio_file").on("click", function() {
		var title = $("#drag_drop").find("#audio_file_title").text();
		var $tmpAudio = $("#tmp_audio");
		var $ul = $("#file_import_area").find("ul");

		if ($tmpAudio.css("display") != "none" && $tmpAudio.attr("src") != undefined) {
			var $li = htmlCreate.li({ id: "testAudio", class: "import_file" });
			$li.append("<span>" + title + "</span>")
				.append("<audio class='tese' src='" + $tmpAudio.attr("src") + "' controls </audio>");

			$li.appendTo($ul);

			dropDown.hide(dropDown.reset);
		}

		return false;
	});


	// 予約リストを閉じる処理
	// $("#main").on("click", function(e) {
	// 	e.preventDefault();

	// 	var $this = $(this);
	// 	if ($this.data("right_menu") == true && $("#sideMenu").css("display") != "none") {
	// 		$("#menu").trigger("click");
	// 	}

	// 	$this.data("right_menu", false);
	// });

	$("body").on("dragend", function(e) {
		e.preventDefault();
		e.stopPropagation();

		if ($("#glayLayer").css("display") != "none") {
			$("#glayLayer").fadeOut(200);
			$("#drag_drop").fadeOut(200);

			console.log("dragend test");
		}
		return false;
	});

	$("body").on("drop", function(e) {
		e.preventDefault();
		e.stopPropagation();
		return false;
	});

	// 予約リストに対するイベント付加
	$('#menu').sidr({
      name: 'sideMenu',
      side: 'right',
      displace: false
    }).on("click", function() {
    	$tooltip.hide();
    });

	// 各コンポーネントをホバーした時のイベント
	// $(".component").hover(function(e) {
	// 	e.preventDefault();

	// 	var $this = $(this);

	// 	tooltip($this.data("component"));
	// }, function(e) {
	// 	e.preventDefault();
	// 	$tooltip.hide();
	// });



	// ファイルをドロップした時のイベント処理
	 $("#drag_drop").on("drop", function(e) {
		e.preventDefault();
		e.stopPropagation();

		var fileReader = new FileReader();

		$(fileReader).on("load", function(file) {
			var $tmpAudio = $("#tmp_audio");

			console.log("正常に読み込まれました");
			console.log(file);

			$tmpAudio[0].src = file.target.result;
			$tmpAudio.removeClass("display-none");
		})

		// ドロップしたファイルオブジェクト
		var dropFile = e.originalEvent.dataTransfer.files[0];

		if (dropFile != undefined && dropFile.type.indexOf('audio/mp3') === 0) {
			// 動かない $audio[0].src = fileReader.readAsDataURL(dropFile);
			var tmp = fileReader.readAsDataURL(dropFile);
			console.log(tmp);

			$("#audio_file_title").text(dropFile.name);
			$("#audio_file_type").text(dropFile.type);
			$("#audio_file_size").text(dropFile.size);
		}

		return false;
			// FileList {0: File, length: 1, item: function}
			// 0: File
			// lastModifiedDate: Sat May 31 2014 04:32:53 GMT+0900 (JST)
			// name: "スクリーンショット 2014-05-31 4.32.43.png"
			// size: 336611
			// type: "image/png" "audio/mp3"
			// webkitRelativePath: ""
			// __proto__: File
			// length: 1
			// __proto__: FileList
	}).on("drag", function(e) {
		e.preventDefault();
		e.stopPropagation();
	});

	 $("#glayLayer").on("click", function() {
	 	$(this).fadeOut();
	 	$("#drag_drop").fadeOut();
	 }).on("dragover", function(e) {
	 	e.preventDefault();
		e.stopPropagation();
	 });




	// wav形式のファイルを作成する
	//////////////////////////////////////////////////////////////
	//                           TODO                           //
	// この関数はwavファイルを作成するだけの機能とするli要素はの機能にする //
	//////////////////////////////////////////////////////////////
	function wavExport(blob) {
		console.log("wavExported event callback");

		var date = new Date();
		var fileName =  date.toISOString() + '.wav';
		var url = URL.createObjectURL(blob);

		// 作成したwavファイル
		var $li = $("<li>")
			.addClass("wav")
			.text(fileName)
			.data("blobURL", url)
			.on("click", function() {
				// 作成したwav形式の音楽ファイルをオーディオプレイヤーで再生する
				console.log("click wav file");

				if ($(audio).hasClass("display-none")) {
					$(audio).removeClass("display-none");
				}

				// wav形式の音楽ファイルのURLを取得
				audio.src = $(this).data("blobURL");
			})
			.appendTo($("#download_list"));


		//////////////////////////////
		//            TODO          //
		// DOWNLOAD's DOM is change //
		//////////////////////////////
		$("#download_list").append('<li><a href="' + url + '" download="' + fileName + '">Download</a>' + '</li>');

		// audioタグに音声ファイルを埋め込む
		audio.src = window.URL.createObjectURL(blob);
		recorder.clear();

		// 今録音した音声ファイルをすぐに再生するか
		if (window.confirm("すぐに再生しますか？")) {

			// remove audio's display-none class
			if ($(audio).hasClass("display-none")) {
				$(audio).removeClass("display-none");
			}

			// force occur click event for new $li
			$li.trigger("click");

			if ($.player != undefined) {
				// プレーヤーを先頭までシークする
				// restart();

				// プレーヤーの現在の状態を取得する
				var currentPlayerStatus = $.player.ext_getStatus();

				console.log("player status is " + currentPlayerStatus);

				if (currentPlayerStatus == "end") {
					// プレーヤーが止まっている時はもう一度再生する
					// $("#player_start").trigger("click");
					//$.play.ext_play(true);
					// move seek bar to head
		//$.player.ext_setPlayheadTime($.player.ext_getPlayheadTime() * -1);


		// プレーヤーを先頭までシークする
				restart();

					console.log("occured player_start click ");
				}

			}
			audio.play();
			console.log("occured audio play event");
		}
	};

	function changeMuteButtonInfo(bool) {
		video.muted = bool;
		if (bool) {
			$mute.text("ミュートを解除する");
		} else {
			$mute.text("ミュート");
		}
	}

	//$("#createPlayer").on("click", createNicoPlayer($("#nico_url").val()));



	// ランキング情報を取得取得する。
	// 今は100件丸々取得しているため時間がかかっているのでlimitとfromを活用してスクロール量で取得するようにするかもっと見るボタンを設置する->やっぱなし
	$ranking.on("click", function() {
		searchRankingMovie();
	});

	function searchRankingMovie(from, rankingObject) {
		from = from != undefined ? from : 0;
		var more = from != 0;
		var requestUrl;

		if (rankingObject == undefined) {
			requestUrl = "http://api.ce.nicovideo.jp/nicoapi/v1/video.ranking?type=" + $(".ranking_type").val() + "&span=" + $(".ranking_span").val() + "&genre=" + $(".ranking_genre").val() +"&__format=json";
		} else {
			requestUrl = "http://api.ce.nicovideo.jp/nicoapi/v1/video.ranking?type=" + rankingObject.type + "&span=" + rankingObject.span + "&genre=" + rankingObject.genre +"&limit=20&__format=json";
		}

		// もっと見るボタンを押下時
		// if (more) {
		// 	requestUrl += "&from=" + from;
		// }

		var videoJsons;
		var count;
		var resultJsons;

		var $videos = $("#ranking_result_videos");


		$.when(ajaxRequest(requestUrl))
			.done(function(jsons) {
				resultJsons = jsons.nicovideo_video_response;
				// Object {count: "20", video_info: Array[20], total_count: "22500", tags: Object, @status: "ok"}
				count = resultJsons.count;
				videoJsons =  resultJsons.video_info;

				// 検索結果の初期化
				// if (!more) {
					$videos.empty();
				// } else {
				// 	var $lastList = $videos.find("li:last");

				// 	if ($lastList.size() != 0 && $lastList.hasClass("more")) {
				// 		$lastList.remove();
				// 	}
				// }

				$.each(videoJsons, function() {
					var video = this.video;
						// deleted: "0"
						// first_retrieve: "2012-02-24T19:00:47+09:00"
						// id: "sm17064620"
						// length_in_seconds: "284"
						// mylist_counter: "42072"
						// option_flag_community: "0"
						// options: Object
						// ppv_video: "0"
						// provider_type: "regular"
						// thumbnail_url: "http://tn-skr1.smilevideo.jp/smile?i=17064620"
						// title: "【初音ミク・巡音ルカ】アカツキアライヴァル【オリジナル】"
						// upload_time: "2012-02-25T03:53:36+09:00"
						// view_counter: "721383"
						// vita_playable: "OK"

					var $li = htmlCreate.li({ data: {videoId: video.id, videoTitle: video.title, imgSrc: video.thumbnail_url, time: video.length_in_seconds }, class: "ranking-result-movie" });
					$li.append(htmlCreate.img({ src: video.thumbnail_url, class: "float-left" }));

					$li.append("<div class='float-left ranking-content-area'><span class='content_title'>" + video.title + "</span><span class='content_option'>再生数： " + video.view_counter + "回  長さ： " + video.length_in_seconds + "秒  マイリス： " + video.mylist_counter + "</span></div>")
					.append("<div class='video_favorite_area'><img src='./images/SVG/star129.svg' class='favorite_add'></div>").appendTo($videos);
				});

					// var $ul = $("<ul>");

					// 	$ul.append("<li><span>" + video.title + "</span></li")
					// 	   .append("<li><span>再生数: " + video.view_counter + "</span></li>")
					// 	   .append("<li><span>再生時間: " + video.length_in_seconds + "</span></li>");

					// 	var $div = $("<div>").addClass("float-left video-content-area");

					// 	$ul.appendTo($div);

					// var $li = htmlCreate.li({ video_id: video.id, class: "search-result-movie" });
					// $li.append(htmlCreate.img({ src: video.thumbnail_url, class: "float-left" }));

					// $div.appendTo($li).appendTo($videos);






				// 今までの検索結果と今回もっと見るボタンの押下によって増えた検索の合計が全体の検索の検索よりも少ない時
				// if(from + Number(resultJsons.count) < 100) {
				// 	$li = htmlCreate.li({ class: "search-result-movie more" })
				// 			.text("もっと見る")
				// 			.data("from", from + 20)
				// 			.data("ranking", {
				// 				type: $(".ranking_type").val(),
				// 				span: $(".ranking_span").val(),
				// 				genre: $(".ranking_genre").val()})
				// 			.appendTo($videos);
				// }

				$videos.removeClass("display-none");

				// もっと見るを押下した時はスクロールはしない
				// if (!more) {
				scrolling($("#ranking_contents"));
				// }
			});
	}

	var searchNicoVideo = function(options) {

	};

	// この検索ロジックは新規で提供されているAPIに変更したい
	function searchVideos(keywords, from) {
		from = from != undefined ? from : 0;
		var more = from != 0;
		var requestUrl = "http://api.ce.nicovideo.jp/nicoapi/v1/video.search?__format=json&limit=20&order=d&sort=v&str=" + keywords;

		// もっと見るボタンを押下時
		if (more) {
			requestUrl += "&from=" + from;
		}

		var resultJsons;
		var count;
		var videoJsons;
		var videoJson;
		var $videos = $("#search_result_videos"); // videos

		$.when(ajaxRequest(requestUrl))
			.done(function(jsons) {
				resultJsons = jsons.nicovideo_video_response;
				// Object {count: "20", video_info: Array[20], total_count: "22500", tags: Object, @status: "ok"}
				count = resultJsons.count;
				videoJsons =  resultJsons.video_info;

				// 検索結果の初期化
				if (!more) {
					$videos.empty();
				} else {
					var $lastList = $videos.find("li:last");

					if ($lastList.size() != 0 && $lastList.hasClass("more")) {
						$lastList.remove();
					}
				}

				$.each(videoJsons, function() {
					var video = this.video;

					var $li = htmlCreate.li({ data: {videoId: video.id, videoTitle: video.title,  imgSrc: video.thumbnail_url, time: video.length_in_seconds }, class: "search-result-movie" });
					$li.append(htmlCreate.img({ src: video.thumbnail_url, class: "float-left" }));

					$li.append("<div class='float-left video-content-area'><span>" + video.title + "</span><span class='content_option'>再生数： " + video.view_counter + "回  長さ： " + video.length_in_seconds + "秒  マイリス： " + video.mylist_counter + "</span></div>")
					   .append("<div class='video_favorite_area'><img src='./images/SVG/star129.svg' class='favorite_add'></div>").appendTo($videos);
				});

				// 今までの検索結果と今回もっと見るボタンの押下によって増えた検索の合計が全体の検索の検索よりも少ない時
				if(from + Number(resultJsons.count) < resultJsons.total_count) {
					$li = htmlCreate.li({ class: "search-result-movie more" }).text("もっと見る").data("query", keywords).data("from", from + 20).data("func", "searchRankingMovie").appendTo($videos);
				}

				if ($("#search_result").hasClass("display-none")) {
					$("#search_result").removeClass("display-none");
					//$videos.removeClass("display-none");
				}

				// もっと見るを押下した時はスクロールはしない
				if (!more) {
					scrolling($("#search_result"));
				}

			});
	}


	function createIframe(target, html) {
		var iframeDocument = target.contentWindow.document;

		// open iframe document
		iframeDocument.open();

		// write html code in iframe document
		iframeDocument.write(html);

		// close iframe document
		iframeDocument.close();
	}

	function createPlayerHtml(url) {
		return "<html><head><script src='https://ajax.googleapis.com/ajax/libs/jquery/1.10.2/jquery.min.js'></script></head><body style='margin:0; padding:0; background-color:#000;'><script src='http://ext.nicovideo.jp/thumb_watch/" + url + "?w=700&h=400&tr=1'></script><script type='text/javascript' src='./sub_script.js'></script></body></html>";
	}

	function xdomainAjaxCallBack(result) {
		var html = $.parseHTML(result.results[0]);
		var $pElement = $(html[5]);

		return $.parseJSON($pElement.text());
	}

	function ajaxRequest(requestUrl) {
		var $img = $("#back-top").find("img");

		$img.attr("src", "/images/89.GIF");

		// Defferdオブジェクトを取得
		var $def = $.Deferred();

		$.ajax({
			type: "GET",
			url: requestUrl,
			crossDomain: true
		}).done(function(result) {
			var json = xdomainAjaxCallBack(result);
			$def.resolve(json);
		}).complete(function() {
			$img.attr("src", "images/SVG/arrows6.svg");
		});

		return $def.promise();
	}

	$.test = function(words) {
		words = words != "" ? words : "初音ミク"

		var obj =  {
		  "query": words,
		  "service":[
		    "video"
		  ],
		  "search":[
		    "title",
		    "tags"
		  ],
		  "join":[
		    "cmsid",
		    "title",
		    "view_counter",
		    "length_in_seconds",
		    "mylist_counter",
		    "thumbnail_url"
		  ],
		  "filters":[
		    {
		      "type": "equal",
		      "field": "music_download",
		      "value": true
		    }
		  ],
		  "from": 0,
		  "size": 3,
		  "sort_by": "view_counter",
		  "issuer": "nicokaraoke.webcrow.jp",
		  "reason": "html5jc"
		};

		var json = JSON.stringify(obj);

		$.ajax({
			type: "POST",
			contentType: "application/json",
			url: "http://api.search.nicovideo.jp/api/",
			data: json,
			dataType: "text",
			crossDomain: true
		}).done(function(result) {
			console.log("test result is " + result.length);

			var responseArray = [];

			if (result != undefined || result != "") {
				responseArray = result.split("\n");
			}

		}).fail(function(result, errorContent) {
			console.log("fail");
		}).complete(function() {
			console.log("complete");
		})
	};


	// (function midi() {
	//     navigator.requestMIDIAccess()
	//     .then(
	//       function(midiAccess){
	//         midiObject = midiAccess;
	//         },
	//       function(error){
	//         alert(error);
	//     });
 //  	})();

	createNicoPlayer("sm11832728");


	//  var mousewheelevent = 'onwheel' in document ? 'wheel' : 'onmousewheel' in document ? 'mousewheel' : 'DOMMouseScroll';

	// $("body").on(mousewheelevent, function(e) {
	// 	e.preventDefault();

	// 	console.log("test");

	// 	var delta = e.originalEvent.deltaY ? -(e.originalEvent.deltaY) : e.originalEvent.wheelDelta ? e.originalEvent.wheelDelta : -(e.originalEvent.detail);

	// 	if (delta > 0) {
	// 		$(this).scrollTop(window.pageYOffset - 50);
	// 	} else {
	// 		$(this).scrollTop(window.pageYOffset + 50);
	// 	}
	// });

});