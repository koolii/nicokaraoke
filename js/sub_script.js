$(function(){
	// get parent jQuery Object
	// 動画を再生してからコントローラー以外をクリックすると、勝手にHTTPリクエストを送ってしまう
	// さらにその結果エラーが返ってくるため、このWindowオブジェクトに参照することができなくなってしまう
	// なので親であるParentオブジェクトに各イベントを埋め込むようにする
	var $parent = parent.$;

	$(window).on("load", function() {
		// <div value="test" style="display: block; position: fixed; left:0px; top: 0px; overflow: auto; background-color: red; width: 600px; height: 500px; opacity: 0.8;"></div>
			// 動画を表示する
		var $player = $(parent.document).find("#player");

		if ($player[0] != undefined && $player.hasClass("display-none")) {
			$player.fadeIn();
		}

		$(parent.document).find("#player_components").removeClass("display-none");

		var $div = 	$("<div>").css({
						"position": "fixed",
						"left": "0px",
						"top": "0px",
						"overflow": "auto",
						"background-color": "#FACC2E",
						"width": "700px",
						"height": "400px",
						"opacity": "1",
						"text-align": "center",
						"display": "none"
					}).attr("id", "player_background").appendTo($("body"));

		// 動画が再生できない場合
		if ( $("body").find("embed").size() != 1) {
			$div.css("display", "block").append("<span style='line-height: 400px; font-size: 30px;'>この動画はニコニコ動画でのみ再生可能です</span>");
		} else {
			// 再生ボタン以外をDIVタグで囲う
			$("<div>")
				.css({
					"position": "fixed",
					"opacity": "0",
					"top": "0px",
					"width": "100%",
					"height": "160px"
				}).attr("id", "video_wrap").appendTo($("body"));

			$("<div>")
				.css({
					"position": "fixed",
					"opacity": "0",
					"top": "0px",
					"left": "0px",
					"width": "275px",
					"height": "100%"
				}).addClass("readAfterRemove").appendTo($("body"));

			$("<div>")
				.css({
					"position": "fixed",
					"opacity": "0",
					"top": "0px",
					"right": "0px",
					"width": "275px",
					"height": "100%"
				}).addClass("readAfterRemove").appendTo($("body"));

			$("<div>")
				.css({
					"position": "fixed",
					"opacity": "0",
					"bottom": "0px",
					"width": "100%",
					"height": "160px",
				}).addClass("readAfterRemove").appendTo($("body"));
		}


	});

	/////////////////////////////
	// NICO NICO API CALLBACKs //
	/////////////////////////////

	window.onNicoPlayerReady = function(id) {
		var $videoWrap = $("#video_wrap");

		console.log("onNicoPlayerReady:" + id);

		if ($videoWrap.size() != 0) {
			$videoWrap.css("height", "380px");
			$(".readAfterRemove").remove();
		}

		// 親のWiindowオブジェクトからもアクセスできるようになった
		$parent.player = document.getElementById(id);
		$parent.player.comment_flg = true;
	}

	/**
	 * ステータスが設定されたときに実行されるイベント
	 * onNicoPlayerStatusの前に実行されてる。
	 */
	window.setPlayerStatus = function(status)  {
		console.log("setPlayerStatus :" + status);
		// プレイヤー内の曲の再生が終了したとき
		if (status == "end") {
			$parent.playerOperate.end();

			$parent.record.finish();
			return false;
		}
	}

	/*
	* プレイヤーのステータスが変更された場合に実行されるイベント
	* @param {String} id イベント元のプレイヤーのID
	* @param {String} status 以下のいずれか
	*                 playing ... 動画再生したとき、シークした後も
	*                 seeking ... シークバーを動かした後
	*                 paused  ... 動画の再生の一時停止
	*                 end     ... 再生終了
	*/
	window.onNicoPlayerStatus = function(id, status){
		console.log(id +  ':' + status);

		// プレイヤー内の曲の再生が終了したとき
		if (status == "end") {
			$parent.record.onEnd();
			$parent.record.finish();

			// 録音中だったときのみ
			if ($endButton.attr("disabled") != "disabled") {
				// 録音を終了させる

			}
		}
	}

	// it doesn't move. Why???
	// $(window).on({
	// 	"onNicoPlayerready":  function(id) {
 	//  			console.log("onNicoPlayerReady:" + id);
	//  			player = document.getElementById(id);
	// 	},
	// 	"setPlayerStatus": function(status)  {
	//   		console.log("setPlayerStatus :" + status);
	// 	},
	// 	"onNicoPlayerStatus": function(id, status){
	//   		console.log(id +  ':' + status);
	//   		console.log(player);
	//   	}
	// });
});