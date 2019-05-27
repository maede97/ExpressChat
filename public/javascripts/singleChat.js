$(() => {
  $("#send").click(() => {
    sendMessage({
      message: $("#message").val()
    });
    $("#message").val("");
    $("#message").focus();
  });
  $("#message").keypress((e) => {
    if (e.which == 13) {
      sendMessage({
        message: $("#message").val()
      });
      $("#message").val("");
    }
  });
});

function sendMessage(message) {
    $.post(location.protocol + '//' + location.hostname + (location.port ? ':' + location.port : '') + '/message/' + toUser, message);
}

function formatDate() {
  let d = new Date();
  return d.toISOString().slice(0,10) +" "+ d.toISOString().slice(11,19)
}

function scrollToBottom() {
  $('.msg_history').scrollTop($('.msg_history')[0].scrollHeight);
}

$(document).ready(()=>{
  scrollToBottom();
  $('#message').focus();
});

// socket stuff
var socket = io();
socket.on('privateMessage', function (data) {
  if (username == data.mFrom) {
    $('<div class="outgoing_msg">\
        <div class="sent_msg">\
          <p>'+ data.message + '</p>\
          <span class="time_date">UTC '+ formatDate() + '</span>\
        </div>\
      </div>').appendTo('.msg_history');
  } else {
    $('<div class="incoming_msg">\
        <div class="received_withd_msg">\
          <p>\
            <a href="/chat/'+ data.mFrom + '">' + data.mFrom + '</a>: ' + data.message + '\
          </p>\
          <span class="time_date">UTC '+ formatDate() + '</span>\
        </div>\
      </div>').appendTo('.msg_history');
  }
  scrollToBottom();
});