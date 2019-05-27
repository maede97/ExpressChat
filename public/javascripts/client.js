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
  $.post(location.protocol + '//' + location.hostname + (location.port ? ':' + location.port : '') + '/message', message);
}

function formatDate() {
  let d = new Date();
  return d.toISOString().slice(0, 10) + " " + d.toISOString().slice(11, 19)
}

function scrollToBottom() {
  $('.msg_history').scrollTop($('.msg_history')[0].scrollHeight);
}

$(document).ready(() => {
  scrollToBottom();
  $('#message').focus();
});

var socket = io();

socket.on('login', function (data) {
  $('<div class="admin_msg"><p>' + data.user + ' just logged in.</p></div>').appendTo('.msg_history');
  scrollToBottom();
});
socket.on('logout', function (data) {
  $('<div class="admin_msg"><p>' + data.user + ' just logged out.</p></div>').appendTo('.msg_history');
  scrollToBottom();
});
socket.on('register', function (data) {
  $('<div class="admin_msg"><p>' + data.user + ' just registered. Say Hi!</p></div>').appendTo('.msg_history');
  scrollToBottom();
});

socket.on('message', function (data) {
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